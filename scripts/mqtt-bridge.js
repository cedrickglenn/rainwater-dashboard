/**
 * MQTT → MongoDB bridge
 *
 * Subscribes to MQTT topics that require persistent connection (ACKs)
 * and writes incoming messages to MongoDB.
 *
 * Run this on any always-on machine (dev PC, Raspberry Pi, Railway, etc.):
 *   node scripts/mqtt-bridge.js
 *
 * Required env vars (same .env as the app):
 *   HIVEMQ_HOST, HIVEMQ_USERNAME, HIVEMQ_PASSWORD, MONGODB_URI, DB_NAME
 */

import 'dotenv/config';
import mqtt from 'mqtt';
import { MongoClient } from 'mongodb';

const {
  HIVEMQ_HOST, HIVEMQ_USERNAME, HIVEMQ_PASSWORD,
  MONGODB_URI, DB_NAME = 'rainwateriot',
} = process.env;

if (!HIVEMQ_HOST || !HIVEMQ_USERNAME || !HIVEMQ_PASSWORD || !MONGODB_URI) {
  console.error('Missing required env vars. Check .env');
  process.exit(1);
}

// --- MongoDB ---
const mongoClient = new MongoClient(MONGODB_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);
console.log(`[mongo] Connected to ${DB_NAME}`);

// --- MQTT ---
const mqttClient = mqtt.connect(`mqtts://${HIVEMQ_HOST}:8883`, {
  username: HIVEMQ_USERNAME,
  password: HIVEMQ_PASSWORD,
  clientId: `rainwater_bridge_${Math.random().toString(16).slice(2, 10)}`,
  reconnectPeriod: 5000,
});

mqttClient.on('connect', () => {
  console.log('[mqtt] Connected to HiveMQ');
  mqttClient.subscribe('rainwater/calibration/acks', { qos: 1 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/calibration/acks');
  });
  mqttClient.subscribe('rainwater/acks', { qos: 1 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/acks');
  });
  mqttClient.subscribe('rainwater/logs', { qos: 0 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/logs');
  });
  mqttClient.subscribe('rainwater/sensors', { qos: 0 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/sensors');
  });
  mqttClient.subscribe('rainwater/heartbeat', { qos: 0 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/heartbeat');
  });
});

// ---------------------------------------------------------------------------
// Log frame parser — mirrors api.activity.jsx parseLogFrame
// Format A (Mega):  L,<SOURCE>,<LEVEL>,<MESSAGE>
// Format B (ESP32): L,<LEVEL>,<CATEGORY>,<MESSAGE>
// ---------------------------------------------------------------------------
const LEVEL_TOKENS = new Set(['INFO', 'WARN', 'ERR', 'OK']);
const TYPE_MAP     = { INFO: 'info', WARN: 'warning', ERR: 'error', OK: 'success' };

function parseLogFrame(raw) {
  const s = raw.trim();
  if (!s.startsWith('L,')) return null;
  const parts = s.split(',');
  if (parts.length < 4) return null;

  let source, level, category, message;
  if (LEVEL_TOKENS.has(parts[1])) {
    level    = parts[1];
    category = parts[2];
    message  = parts.slice(3).join(',');
    source   = category;
  } else {
    source   = parts[1];
    level    = parts[2];
    message  = parts.slice(3).join(',');
    category = source;
  }

  return { source, level, category, message, raw: s, type: TYPE_MAP[level] ?? 'info', timestamp: new Date() };
}

mqttClient.on('message', async (topic, payload) => {
  const raw = payload.toString().trim();
  console.log(`[mqtt] ${topic}: ${raw}`);

  try {
    if (topic === 'rainwater/calibration/acks') {
      // Format: A,CAL_PH,C2,MID,OK,2.53
      const parts = raw.split(',');
      // parts: [A, command, container, point, status, value?]
      const [, command, container, point, status, value] = parts;

      await db.collection('calibration_acks').insertOne({
        raw, command, container, point,
        status: status ?? null,
        value:  value  ?? null,
        timestamp: new Date(),
      });

      // Mark matching command as acked/failed
      await db.collection('calibration_commands').updateOne(
        { command, container, point, status: 'sent' },
        { $set: { status: status === 'OK' ? 'acked' : 'failed', ackedAt: new Date() } },
        { sort: { createdAt: -1 } }
      );
    }

    if (topic === 'rainwater/acks') {
      // Format: A,VALVE,V1,OK  or  A,PUMP,P1,ERR
      const parts  = raw.split(',');
      const [, , actuatorId, result] = parts; // e.g. A, VALVE, V1, OK

      await db.collection('command_acks').insertOne({ raw, timestamp: new Date() });

      if (actuatorId) {
        if (result === 'OK') {
          // Confirm the state that was commanded
          await db.collection('actuator_states').updateOne(
            { actuatorId },
            { $set: { confirmed: true, ackedAt: new Date() } }
          );
        } else {
          // Mega rejected the command — revert to opposite state
          const doc = await db.collection('actuator_states').findOne({ actuatorId });
          if (doc) {
            const reverted = doc.state === 'ON' ? 'OFF' : 'ON';
            await db.collection('actuator_states').updateOne(
              { actuatorId },
              { $set: { state: reverted, confirmed: true, ackedAt: new Date() } }
            );
          }
        }
      }
    }
    if (topic === 'rainwater/logs') {
      const entry = parseLogFrame(raw);
      if (entry) {
        await db.collection('activity_logs').insertOne(entry);
      }
    }

    if (topic === 'rainwater/heartbeat') {
      // {"source":"esp32"} — upsert device_heartbeats, same as api.heartbeat.jsx did
      try {
        const { source } = JSON.parse(raw);
        if (source) {
          await db.collection('device_heartbeats').updateOne(
            { source },
            { $set: { source, lastSeen: new Date() } },
            { upsert: true }
          );
          console.log(`[bridge] Heartbeat upserted for ${source}`);
        }
      } catch {
        // Malformed payload — skip
      }
    }

    if (topic === 'rainwater/sensors') {
      // Throttle to one write per 2s — Mega sends every 2s anyway and we
      // only need this for the MEGA online/offline liveness check in the SSE
      // stream (MEGA_TIMEOUT_MS = 10s, so 2s cadence gives 5× margin).
      const now = Date.now();
      if (!global._lastSensorWrite || now - global._lastSensorWrite >= 2000) {
        global._lastSensorWrite = now;
        try {
          const payload = JSON.parse(raw);
          await db.collection('sensor_readings').insertOne({
            timestamp: new Date(),
            metadata:  { source: 'esp32' },
            ...payload,
          });
        } catch {
          // Malformed JSON — skip
        }
      }
    }
  } catch (err) {
    console.error('[bridge] DB write error:', err.message);
  }
});

mqttClient.on('error', (err) => {
  console.error('[mqtt] Error:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[mqtt] Reconnecting...');
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  mqttClient.end();
  await mongoClient.close();
  process.exit(0);
});

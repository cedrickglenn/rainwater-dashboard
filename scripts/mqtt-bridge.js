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
 *   MQTT_HOST, MQTT_USERNAME, MQTT_PASSWORD, MONGODB_URI, DB_NAME
 */

import 'dotenv/config';
import http from 'http';
import mqtt from 'mqtt';
import { MongoClient } from 'mongodb';
import webpush from 'web-push';

const {
  MQTT_HOST, MQTT_USERNAME, MQTT_PASSWORD,
  MONGODB_URI, DB_NAME = 'rainwateriot',
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
} = process.env;

if (!MQTT_HOST || !MQTT_USERNAME || !MQTT_PASSWORD || !MONGODB_URI) {
  console.error('Missing required env vars. Check .env');
  process.exit(1);
}

// Configure web-push VAPID — if keys are missing, push dispatch is skipped
const pushEnabled = VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT;
if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[push] VAPID configured — push dispatch enabled');
} else {
  console.warn('[push] VAPID env vars missing — push dispatch disabled');
}

// --- MongoDB ---
const mongoClient = new MongoClient(MONGODB_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);
console.log(`[mongo] Connected to ${DB_NAME}`);

// --- SSE log stream server ---
// Browsers connect to GET /logs/stream and receive real-time log/debug events.
// Vercel's api.logs.stream proxies here instead of opening its own MQTT connection.
const SSE_PORT = process.env.SSE_PORT || 3001;
const sseClients = new Set();

const sseServer = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/logs/stream') {
    res.writeHead(200, {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const send = (eventType, data) => {
      try {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {}
    };

    send('ping', { ts: Date.now() });
    send('status', { connected: mqttClient?.connected ?? false });

    sseClients.add(send);
    console.log(`[sse] Client connected (${sseClients.size} total)`);

    req.on('close', () => {
      sseClients.delete(send);
      console.log(`[sse] Client disconnected (${sseClients.size} total)`);
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: sseClients.size }));
    return;
  }

  res.writeHead(404);
  res.end();
});

sseServer.listen(SSE_PORT, () => {
  console.log(`[sse] Listening on port ${SSE_PORT}`);
});

function broadcastLog(eventType, data) {
  for (const send of sseClients) send(eventType, data);
}

// --- MQTT ---
const mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}:8883`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: `rainwater_bridge_${Math.random().toString(16).slice(2, 10)}`,
  reconnectPeriod: 5000,
});

mqttClient.on('connect', () => {
  console.log('[mqtt] Connected to EMQX');
  broadcastLog('status', { connected: true });
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
  mqttClient.subscribe('rainwater/actuators', { qos: 0 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/actuators');
  });
  mqttClient.subscribe('rainwater/debug', { qos: 0 }, (err) => {
    if (err) console.error('[mqtt] Subscribe error:', err.message);
    else     console.log('[mqtt] Subscribed to rainwater/debug');
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

// ---------------------------------------------------------------------------
// Push notification dispatch
// ---------------------------------------------------------------------------

// Types that always warrant a push
const PUSH_TYPES = new Set(['warning', 'error']);
// Categories that warrant a push on 'success' type (process completions)
const PUSH_SUCCESS_CATEGORIES = new Set(['ACTUATOR', 'PUMP', 'TANK', 'SYSTEM', 'FILTER']);

function shouldPush(entry) {
  if (PUSH_TYPES.has(entry.type)) return true;
  if (entry.type === 'success' && PUSH_SUCCESS_CATEGORIES.has(entry.category)) return true;
  return false;
}

async function dispatchPush(db, entry) {
  if (!pushEnabled || !shouldPush(entry)) return;

  const subscriptions = await db.collection('push_subscriptions').find({}).toArray();
  if (subscriptions.length === 0) return;

  const title = entry.type === 'error'   ? 'RainWater — Error'
              : entry.type === 'warning' ? 'RainWater — Warning'
              : 'RainWater — System';

  const payload = JSON.stringify({
    title,
    body: entry.message,
    icon: '/icons/icon.svg',
    tag: `rainwater-${entry.type}`,
    url: '/',
  });

  const staleEndpoints = [];
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
      } catch (err) {
        // 410 Gone = subscription expired or user revoked permission
        if (err.statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error('[push] Send error:', err.message);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await db.collection('push_subscriptions').deleteMany({ endpoint: { $in: staleEndpoints } });
    console.log(`[push] Removed ${staleEndpoints.length} stale subscription(s)`);
  }
}

mqttClient.on('message', async (topic, payload) => {
  const raw = payload.toString().trim();
  console.log(`[mqtt] ${topic}: ${raw}`);

  try {
    if (topic === 'rainwater/calibration/acks') {
      // Normal format:   A,CAL_PH,C2,MID,OK,2.53
      // CAL_RESET format: A,CAL_RESET,OK  (no container/point fields)
      const parts = raw.split(',');
      let command, container, point, status, value;
      if (parts[1] === 'CAL_RESET') {
        [, command] = parts;
        container = null; point = null; status = parts[2]; value = null;
      } else {
        [, command, container, point, status, value] = parts;
      }

      await db.collection('calibration_acks').insertOne({
        raw, command,
        container: container ?? null,
        point:     point     ?? null,
        status:    status    ?? null,
        value:     value     ?? null,
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
        await dispatchPush(db, entry);
      }
      broadcastLog('log', { raw, level: entry?.level ?? 'INFO', source: entry?.source ?? null, message: entry?.message ?? raw, ts: Date.now(), channel: 'logs' });
    }

    if (topic === 'rainwater/debug') {
      broadcastLog('log', { raw, level: 'INFO', source: null, message: raw, ts: Date.now(), channel: 'debug' });
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

    if (topic === 'rainwater/actuators') {
      // Format: "V1:0,V2:1,V3:0,V4:0,V5:0,V6:0,V7:0,V8:0,P1:0,P2:1,P3:0,P4:0"
      // Upsert each actuator with its real hardware state. confirmed:true because
      // this comes directly from the Mega's pin state, not a commanded intent.
      const pairs = raw.split(',');
      await Promise.all(pairs.map((pair) => {
        const [id, val] = pair.split(':');
        if (!id || val === undefined) return;
        const state = val.trim() === '1' ? 'ON' : 'OFF';
        const type  = id.startsWith('V') ? 'VALVE' : 'PUMP';
        return db.collection('actuator_states').updateOne(
          { actuatorId: id },
          { $set: { actuatorId: id, type, state, confirmed: true, updatedAt: new Date(), source: 'mega' } },
          { upsert: true }
        );
      }));
    }

    if (topic === 'rainwater/sensors') {
      // Throttle to one write per 2s — Mega sends every 2s anyway and we
      // only need this for the MEGA online/offline liveness check in the SSE
      // stream (MEGA_TIMEOUT_MS = 10s, so 2s cadence gives 5× margin).
      const now = Date.now();
      if (!global._lastSensorWrite || now - global._lastSensorWrite >= 2000) {
        global._lastSensorWrite = now;
        try {
          const payload    = JSON.parse(raw);
          const normalized = Object.fromEntries(
            Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v])
          );
          await db.collection('sensor_readings').insertOne({
            timestamp: new Date(),
            metadata:  { source: 'esp32' },
            ...normalized,
          });
          console.log('[bridge] Sensor reading written. Keys:', Object.keys(normalized).join(', '));
        } catch (err) {
          console.error('[bridge] Sensor write failed:', err.message, '| raw length:', raw.length, '| raw (first 200):', raw.slice(0, 200));
        }
      }
    }
  } catch (err) {
    console.error('[bridge] DB write error:', err.message);
  }
});

mqttClient.on('error', (err) => {
  console.error('[mqtt] Error:', err.message);
  broadcastLog('status', { connected: false, error: err.message });
});

mqttClient.on('reconnect', () => {
  console.log('[mqtt] Reconnecting...');
  broadcastLog('status', { connected: false, reconnecting: true });
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  mqttClient.end();
  sseServer.close();
  await mongoClient.close();
  process.exit(0);
});

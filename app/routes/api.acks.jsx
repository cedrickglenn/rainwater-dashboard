// Resource route: /api/acks
//
// NOTE: The ESP32 firmware no longer HTTP-POSTs ACKs here directly.
// ACKs now flow exclusively via MQTT (rainwater/acks) → mqtt-bridge.js → MongoDB,
// which is the single writer for actuator_states.confirmed.
//
// This route is kept as a manual fallback (e.g. curl debugging) but is not
// called in normal operation. Do not add logic here that assumes it receives
// every ACK — use the MQTT bridge for reliable ACK processing.
//
// Original intent: POST — ESP32 posts an ACK from the Mega for VALVE/PUMP commands
// Body (JSON): { raw: "A,VALVE,V1,OK" }

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function action({ request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { raw } = await request.json();
  if (!raw) return json({ error: 'Missing raw' }, { status: 400 });

  // Format: A,VALVE,V1,OK  or  A,PUMP,P1,ERR
  const parts      = raw.trim().split(',');
  const actuatorId = parts[2] ?? null; // V1-V8 or P1-P4
  const result     = parts[3] ?? null; // OK or ERR

  const db = await getDb();

  await db.collection('command_acks').insertOne({ raw, timestamp: new Date() });

  if (actuatorId) {
    if (result === 'OK') {
      await db.collection('actuator_states').updateOne(
        { actuatorId },
        { $set: { confirmed: true, ackedAt: new Date() } }
      );
    } else {
      // Mega rejected — revert to opposite state
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

  return json({ ok: true });
}

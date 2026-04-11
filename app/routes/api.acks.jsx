// Resource route: /api/acks
// POST — ESP32 posts an ACK received from the Mega for VALVE/PUMP commands
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

// Resource route: /api/heartbeat
//
// POST — ESP32 pings this every 30 s to prove it is alive.
//        Body (JSON): { "source": "esp32" }
//
// The handler upserts a single document per source in `device_heartbeats`.
// Callers that need to know if a device is online check the `lastSeen`
// timestamp on that document against a staleness threshold.

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function action({ request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const source = body?.source;
  if (!source) return json({ error: 'Missing source' }, { status: 400 });

  const db = await getDb();
  await db.collection('device_heartbeats').updateOne(
    { source },
    { $set: { source, lastSeen: new Date() } },
    { upsert: true }
  );

  return json({ ok: true });
}

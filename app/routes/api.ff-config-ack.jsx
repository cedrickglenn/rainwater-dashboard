// Resource route: GET /api/ff-config-ack
// Dashboard polls this after submitting FF_CONFIG settings to check whether
// the Mega acknowledged all 6 parameters via rainwater/acks → mqtt-bridge.

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

const EXPECTED = ['THRESHOLD', 'DURATION', 'VOLUME', 'REENTRY', 'IDLE_PULSE', 'FLOW_TIMEOUT'];
const WINDOW_MS = 30_000;

export async function loader() {
  const db    = await getDb();
  const since = new Date(Date.now() - WINDOW_MS);

  const acks = await db.collection('ff_config_acks')
    .find({ timestamp: { $gte: since }, status: 'OK' })
    .toArray();

  const confirmed = new Set(acks.map((a) => a.param));

  return json({
    confirmed: EXPECTED.filter((p) => confirmed.has(p)),
    missing:   EXPECTED.filter((p) => !confirmed.has(p)),
    allOk:     EXPECTED.every((p) => confirmed.has(p)),
  });
}

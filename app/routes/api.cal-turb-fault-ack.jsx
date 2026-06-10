// Resource route: GET /api/cal-turb-fault-ack
// Dashboard polls this after submitting CAL_TURB_FAULT settings to check whether
// the Mega acknowledged all 3 containers via rainwater/acks → mqtt-bridge.

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

const EXPECTED  = ['C2', 'C5', 'C6'];
const WINDOW_MS = 30_000;

export async function loader() {
  const db    = await getDb();
  const since = new Date(Date.now() - WINDOW_MS);

  const acks = await db.collection('cal_turb_fault_acks')
    .find({ timestamp: { $gte: since }, status: 'OK' })
    .toArray();

  const confirmed = new Set(acks.map((a) => a.container));

  return json({
    confirmed: EXPECTED.filter((c) => confirmed.has(c)),
    missing:   EXPECTED.filter((c) => !confirmed.has(c)),
    allOk:     EXPECTED.every((c) => confirmed.has(c)),
  });
}

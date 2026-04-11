// Resource route: /api/activity
//
// POST — ESP32 forwards Mega log frames here.
//        Body (JSON): { raw: "L,MEGA,INFO,Valve V1 opened" }
//
// GET  — Returns recent log entries for the initial dashboard load.
//        ?limit=N (default 30)

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

// ---------------------------------------------------------------------------
// Frame parser
// Format: L,<SOURCE>,<LEVEL>,<MESSAGE>
//   SOURCE : MEGA | ESP32 | SYSTEM
//   LEVEL  : INFO | WARN | ERR | OK
//   MESSAGE: free-form text (may contain commas)
// ---------------------------------------------------------------------------
function parseLogFrame(raw) {
  const s = raw.trim();
  if (!s.startsWith('L,')) return null;

  // Split only on the first 3 commas so the message can contain commas
  const parts = s.split(',');
  if (parts.length < 4) return null;

  const source  = parts[1];
  const level   = parts[2];
  const message = parts.slice(3).join(','); // rejoin trailing parts

  const TYPE_MAP = { INFO: 'info', WARN: 'warning', ERR: 'error', OK: 'success' };

  return {
    source,
    level,
    message,
    raw:       s,
    type:      TYPE_MAP[level] ?? 'info',
    category:  source,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// POST — called by the ESP32
// ---------------------------------------------------------------------------
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

  const { raw } = body;
  if (!raw) return json({ error: 'Missing raw' }, { status: 400 });

  const entry = parseLogFrame(raw);
  if (!entry) {
    return json({ error: `Cannot parse frame: "${raw}"` }, { status: 422 });
  }

  const db     = await getDb();
  const result = await db.collection('activity_logs').insertOne(entry);

  return json({ ok: true, id: result.insertedId });
}

// ---------------------------------------------------------------------------
// GET — initial page load (loader use)
// ---------------------------------------------------------------------------
export async function loader({ request }) {
  const url   = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30', 10), 100);

  const db      = await getDb();
  const entries = await db.collection('activity_logs')
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return json({
    entries: entries.reverse().map((e) => ({
      id:        e._id.toString(),
      source:    e.source,
      level:     e.level,
      message:   e.message,
      type:      e.type      ?? 'info',
      category:  e.category  ?? e.source,
      timestamp: e.timestamp,
    })),
  });
}

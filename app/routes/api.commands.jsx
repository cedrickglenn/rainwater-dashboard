// Resource route: /api/commands
//
// POST — React dashboard queues a control command.
//        Publishes directly to MQTT topic rainwater/commands so the ESP32
//        receives it instantly (no polling delay).
//
// GET  — Legacy fallback: ESP32 polls this if MQTT is unavailable.
//        Returns any commands still marked 'pending' in MongoDB.

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';
import { mqttPublish } from '~/lib/mqtt.server';

// ---------------------------------------------------------------------------
// POST — called by the React actuators/calibration pages
// Body (FormData): { type, id, state }  OR  { intent, commands (JSON) }  OR  { intent: 'estop' }
// ---------------------------------------------------------------------------
export async function action({ request }) {
  const formData = await request.formData();
  const intent   = formData.get('intent');

  // Build the list of cmdLine strings to publish
  let cmdLines = [];

  if (intent === 'estop') {
    cmdLines = ['C,ESTOP,ON'];
  } else if (intent === 'quick_action') {
    const commands = JSON.parse(formData.get('commands'));
    cmdLines = commands.map(({ type, id, state }) => `C,${type},${id},${state}`);
  } else {
    // Single actuator toggle
    const type  = formData.get('type');
    const id    = formData.get('id');
    const state = formData.get('state');
    cmdLines = [`C,${type},${id},${state}`];
  }

  await mqttPublish('rainwater/commands', cmdLines);

  return json({ ok: true, published: cmdLines });
}

// ---------------------------------------------------------------------------
// GET — legacy HTTP polling fallback for ESP32
// Returns commands inserted directly into MongoDB (e.g. from calibration page
// which still uses the old insertOne path, or manual DB entries for debugging).
// ---------------------------------------------------------------------------
export async function loader() {
  const db      = await getDb();
  const pending = await db.collection('commands')
    .find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .toArray();

  if (pending.length > 0) {
    const ids = pending.map((p) => p._id);
    await db.collection('commands').updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'sent', sentAt: new Date() } }
    );
  }

  return json({ commands: pending.map((p) => p.cmdLine) });
}

/**
 * /actuators — redirects to /settings?tab=actuators.
 *
 * The UI lives in app/components/actuators-panel.jsx and is rendered as a
 * Settings tab. This route is kept only for:
 *   1. Backwards-compatible redirects from old bookmarks.
 *   2. The `action` export — the panel posts commands to /actuators so the
 *      MQTT publish + MongoDB state persistence continues to work.
 */

import { json, redirect } from '@remix-run/node';

export const meta = () => [
  { title: 'Actuators | RainSense' },
];

// Hardware definitions (mirrors pins.h) — only the IDs are needed by the
// action handler to expand an E-Stop into a full OFF list.
const VALVE_IDS = ['V1','V2','V3','V4','V5','V6','V7','V8','V9'];
const PUMP_IDS  = ['P1','P2','P3','P4','P5','P6'];

export const loader = async ({ request }) => {
  const { requireOperator } = await import('~/lib/auth.server');
  await requireOperator(request);
  return redirect('/settings?tab=actuators');
};

async function persistStates(commands) {
  const { getDb } = await import('~/lib/db.server');
  const db = await getDb();
  await Promise.all(
    commands.map(({ type, id, state }) =>
      db.collection('actuator_states').updateOne(
        { actuatorId: id },
        {
          $set: {
            actuatorId: id,
            type,
            state,
            confirmed: false,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
    )
  );
}

export const action = async ({ request }) => {
  const { requireOperator } = await import('~/lib/auth.server');
  await requireOperator(request);

  const formData = await request.formData();
  const intent = formData.get('intent');

  const { mqttPublish } = await import('~/lib/mqtt.server');

  let cmdLines = [];
  let toPersist = [];

  if (intent === 'set_filter_mode') {
    const mode = formData.get('mode');
    cmdLines = [`C,FILTER,${mode}`];
  } else if (intent === 'backwash') {
    const action = formData.get('action');
    cmdLines = [`C,BACKWASH,${action}`];
  } else if (intent === 'estop') {
    cmdLines = ['C,ESTOP,ON'];
    toPersist = [
      ...VALVE_IDS.map((id) => ({ type: 'VALVE', id, state: 'OFF' })),
      ...PUMP_IDS.map((id)  => ({ type: 'PUMP',  id, state: 'OFF' })),
    ];
  } else if (intent === 'quick_action') {
    const commands = JSON.parse(formData.get('commands'));
    cmdLines = commands.map(
      ({ type, id, state }) => `C,${type},${id},${state}`
    );
    toPersist = commands;
  } else {
    const type = formData.get('type');
    const id = formData.get('id');
    const state = formData.get('state');
    cmdLines = [`C,${type},${id},${state}`];
    toPersist = [{ type, id, state }];
  }

  await Promise.all([
    mqttPublish('rainwater/commands', cmdLines),
    persistStates(toPersist),
  ]);

  return json({ ok: true, published: cmdLines });
};

export default function ActuatorsRedirect() {
  // Loader always redirects, so this component never renders. The stub exists
  // so Remix treats the module as a valid route.
  return null;
}

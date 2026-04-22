/**
 * /calibration — redirects to /settings?tab=calibration.
 *
 * The UI lives in app/components/calibration-panel.jsx and is rendered as a
 * Settings tab. This route is kept only for:
 *   1. Backwards-compatible redirects from old bookmarks.
 *   2. The `action` export — the panel posts calibration commands to
 *      /calibration so the MQTT publish path continues to work.
 */

import { json, redirect } from '@remix-run/node';

export const meta = () => [
  { title: 'Calibration | RainSense' },
];

export const loader = async ({ request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  await requireAdmin(request);
  return redirect('/settings?tab=calibration');
};

export const action = async ({ request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get('intent');

  const { mqttPublish } = await import('~/lib/mqtt.server');

  // Calibration mode toggle — suspends first flush state machine on the Mega
  if (intent === 'cal_mode') {
    const enable = formData.get('enable') === 'true';
    const cmdLine = `C,CAL_MODE,${enable ? 'ON' : 'OFF'}`;
    await mqttPublish('rainwater/commands', cmdLine);
    return json({ ok: true, calMode: enable });
  }

  const command   = formData.get('command');
  const container = formData.get('container');
  const point     = formData.get('point');
  const value     = formData.get('value');

  let cmdLine = `C,${command},${container}`;
  if (point && point !== '') cmdLine += `,${point}`;
  if (value && value !== '') cmdLine += `,${value}`;

  await mqttPublish('rainwater/calibration/commands', cmdLine);

  return json({ ok: true, queued: cmdLine });
};

export default function CalibrationRedirect() {
  return null;
}

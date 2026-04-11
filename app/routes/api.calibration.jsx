// Resource route: /api/calibration
// POST — React calibration page sends a calibration command.
//        Publishes directly to MQTT topic rainwater/calibration/commands.

import { json } from '@remix-run/node';
import { mqttPublish } from '~/lib/hivemq.server';

export async function action({ request }) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { command, container, point, value } = await request.json();

    let cmdLine = `C,${command},${container}`;
    if (point && point !== '')                               cmdLine += `,${point}`;
    if (value !== undefined && value !== null && value !== '') cmdLine += `,${value}`;

    await mqttPublish('rainwater/calibration/commands', cmdLine);

    return json({ ok: true, cmdLine });
}

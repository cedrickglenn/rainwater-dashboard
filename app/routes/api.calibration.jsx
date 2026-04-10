// Resource route: /api/calibration
// POST — React calibration page queues a calibration command

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function action({ request }) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { command, container, point, value } = await request.json();

    let cmdLine = `C,${command},${container}`;
    if (point && point !== '')                              cmdLine += `,${point}`;
    if (value !== undefined && value !== null && value !== '') cmdLine += `,${value}`;

    const db = await getDb();
    await db.collection('calibration_commands').insertOne({
        command, container, point, value,
        cmdLine,
        status:    'pending',
        createdAt: new Date(),
    });

    return json({ ok: true, cmdLine });
}

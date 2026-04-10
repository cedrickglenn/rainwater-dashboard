// Resource route: /api/commands
// GET  — ESP32 polls for pending control commands
// POST — React dashboard queues a control command

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

// ESP32 polls this
export async function loader() {
    const db      = await getDb();
    const pending = await db.collection('commands')
        .find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .toArray();

    if (pending.length > 0) {
        const ids = pending.map(p => p._id);
        await db.collection('commands').updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'sent', sentAt: new Date() } }
        );
    }

    return json({ commands: pending.map(p => p.cmdLine) });
}

// React app queues a command
// Body: { command: "FILTER", param: "CHARCOAL" }
export async function action({ request }) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { command, param } = await request.json();
    const cmdLine = param ? `C,${command},${param}` : `C,${command}`;

    const db = await getDb();
    await db.collection('commands').insertOne({
        command, param, cmdLine,
        status:    'pending',
        createdAt: new Date(),
    });

    return json({ ok: true, cmdLine });
}

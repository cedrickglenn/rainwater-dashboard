// Resource route: /api/calibration/pending
// GET — ESP32 polls for pending calibration commands

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function loader() {
    const db      = await getDb();
    const pending = await db.collection('calibration_commands')
        .find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .toArray();

    if (pending.length > 0) {
        const ids = pending.map(p => p._id);
        await db.collection('calibration_commands').updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'sent', sentAt: new Date() } }
        );
    }

    return json({ commands: pending.map(p => p.cmdLine) });
}

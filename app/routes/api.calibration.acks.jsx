// Resource route: /api/calibration/acks
// POST — ESP32 posts an ACK received from the Mega
// GET  — React calibration page reads recent ACK results

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

// React reads latest ACKs
export async function loader() {
    const db   = await getDb();
    const acks = await db.collection('calibration_acks')
        .find()
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

    return json({ acks });
}

// ESP32 posts ACK from Mega
// Body: { raw, command, container, point, status, value }
export async function action({ request }) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { raw, command, container, point, status, value } = await request.json();

    const db = await getDb();
    await db.collection('calibration_acks').insertOne({
        raw, command, container, point, status, value,
        timestamp: new Date(),
    });

    // Mark the matching sent command as acked or failed
    await db.collection('calibration_commands').updateOne(
        { command, container, point, status: 'sent' },
        { $set: { status: status === 'OK' ? 'acked' : 'failed', ackedAt: new Date() } },
        { sort: { createdAt: -1 } }
    );

    return json({ ok: true });
}

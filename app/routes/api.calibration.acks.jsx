// Resource route: /api/calibration/acks
// POST — ESP32 posts an ACK received from the Mega
// GET  — React calibration page reads recent ACK results

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

// React reads latest ACKs + a per-(command,container,point) summary of last OK values
export async function loader() {
    const db   = await getDb();
    const acks = await db.collection('calibration_acks')
        .find()
        .sort({ timestamp: -1 })
        .limit(200)
        .toArray();

    // Build summary: latest OK ACK per unique (command, container, point) key.
    // Iterating in descending timestamp order means first match per key wins.
    const seen    = new Set();
    const summary = [];
    for (const a of acks) {
        if (a.status !== 'OK') continue;
        const key = `${a.command}|${a.container ?? ''}|${a.point ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        summary.push({ command: a.command, container: a.container ?? null, point: a.point ?? null, value: a.value ?? null, timestamp: a.timestamp });
    }

    return json({ acks: acks.slice(0, 50), summary });
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

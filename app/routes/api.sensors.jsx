// Resource route: /api/sensors
// POST — ESP32 posts a sensor snapshot

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function action({ request }) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body       = await request.json();
    const db         = await getDb();
    const normalized = Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k.toLowerCase(), v])
    );

    await db.collection('sensor_readings').insertOne({
        timestamp: new Date(),
        metadata:  { source: 'esp32' },
        ...normalized,
    });

    return json({ ok: true });
}

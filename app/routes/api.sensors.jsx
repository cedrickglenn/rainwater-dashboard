// Resource route: /api/sensors
// POST — ESP32 posts a sensor snapshot

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function action({ request }) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await request.json();
    const db   = await getDb();

    await db.collection('sensor_readings').insertOne({
        timestamp: new Date(),
        metadata:  { source: 'esp32' },
        ...body,
    });

    return json({ ok: true });
}

// Resource route: /api/sensors/history?range=24h|week
// GET — React charts read historical sensor data

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function loader({ request }) {
    const url   = new URL(request.url);
    const range = url.searchParams.get('range');
    const hours = range === 'week' ? 168 : 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const db       = await getDb();
    const readings = await db.collection('sensor_readings')
        .find({ timestamp: { $gte: since } })
        .sort({ timestamp: 1 })
        .toArray();

    return json({ readings });
}

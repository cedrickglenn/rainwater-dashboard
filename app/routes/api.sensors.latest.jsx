// Resource route: /api/sensors/latest
// GET — React dashboard reads the most recent sensor snapshot

import { json } from '@remix-run/node';
import { getDb } from '~/lib/db.server';

export async function loader() {
    const db     = await getDb();
    const latest = await db.collection('sensor_readings')
        .findOne({}, { sort: { timestamp: -1 } });

    return json(latest ?? {});
}

/**
 * One-shot migration: lowercase all field keys in sensor_readings documents.
 * Run once: node scripts/migrate-sensor-keys.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const { MONGODB_URI, DB_NAME = 'rainwateriot' } = process.env;
if (!MONGODB_URI) { console.error('Missing MONGODB_URI'); process.exit(1); }

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db(DB_NAME);
const col = db.collection('sensor_readings');

const docs = await col.find({}).toArray();
console.log(`Found ${docs.length} documents`);

let migrated = 0;
for (const doc of docs) {
  const hasUppercase = Object.keys(doc).some(
    (k) => k !== '_id' && k !== 'timestamp' && k !== 'metadata' && k !== k.toLowerCase()
  );
  if (!hasUppercase) continue;

  const normalized = { _id: doc._id, timestamp: doc.timestamp, metadata: doc.metadata };
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_id' || k === 'timestamp' || k === 'metadata') continue;
    normalized[k.toLowerCase()] = v;
  }

  await col.replaceOne({ _id: doc._id }, normalized);
  migrated++;
}

console.log(`Migrated ${migrated} documents (${docs.length - migrated} already lowercase)`);
await client.close();

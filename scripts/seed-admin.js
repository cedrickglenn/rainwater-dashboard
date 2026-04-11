/**
 * Creates the initial admin user in MongoDB.
 * Run once: node scripts/seed-admin.js
 *
 * Uses MONGODB_URI and DB_NAME from .env
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const { MONGODB_URI, DB_NAME = 'rainwateriot' } = process.env;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const USERNAME = process.argv[2] || 'admin';
const PASSWORD = process.argv[3] || 'RainwaterAdmin2026';

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db(DB_NAME);

const existing = await db.collection('users').findOne({ username: USERNAME });
if (existing) {
  console.log(`User "${USERNAME}" already exists (role: ${existing.role}). No changes made.`);
  await client.close();
  process.exit(0);
}

const passwordHash = await bcrypt.hash(PASSWORD, 12);
await db.collection('users').insertOne({
  username:     USERNAME,
  passwordHash,
  role:         'admin',
  createdBy:    'seed',
  createdAt:    new Date(),
  lastLoginAt:  null,
});

// Ensure unique index on username
await db.collection('users').createIndex({ username: 1 }, { unique: true });

console.log(`✓ Admin user "${USERNAME}" created successfully.`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  Change it immediately after first login.`);
await client.close();

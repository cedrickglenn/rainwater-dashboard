import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
}

const uri = process.env.MONGODB_URI;

// In development, Vite HMR resets module-level variables on every hot reload,
// which would create a new connection each time. Caching on globalThis avoids this.
// In production (Vercel), each serverless function invocation may share the same
// Node.js instance, so module-level caching works fine there too.
let clientPromise;

if (process.env.NODE_ENV === 'development') {
    if (!globalThis.__mongoClientPromise) {
        globalThis.__mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = globalThis.__mongoClientPromise;
} else {
    clientPromise = new MongoClient(uri).connect();
}

export async function getDb() {
    const client = await clientPromise;
    return client.db(process.env.DB_NAME || 'rainwateriot');
}

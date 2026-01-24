import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("❌ MONGODB_URI is missing in environment variables");
}

let cached = globalThis._mongo;
if (!cached) cached = globalThis._mongo = { client: null, promise: null };

export async function getDb() {
  if (cached.client) return cached.client.db();

  if (!cached.promise) {
    const client = new MongoClient(uri);
    cached.promise = client.connect().then((client) => {
      cached.client = client;
      return client;
    });
  }

  const client = await cached.promise;
  return client.db();
}

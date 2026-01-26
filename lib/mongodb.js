// lib/mongodb.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI missing");

let cached = globalThis._mongo;
if (!cached) cached = globalThis._mongo = { client: null, promise: null };

async function getClient() {
  if (cached.client) return cached.client;
  if (!cached.promise) {
    const client = new MongoClient(uri);
    cached.promise = client.connect().then((client) => {
      cached.client = client;
      return client;
    });
  }
  return cached.promise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "cdrive");
}

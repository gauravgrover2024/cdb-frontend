// lib/mongodb.js
import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://gauravgrover:uQjRFOimiRgVDvBa@cluster0.uijfp7e.mongodb.net/?appName=Cluster0";

const dbName = process.env.MONGODB_DB || "cdb_app";

if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in Vercel."
  );
}

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    // Modern unified topology options
    retryWrites: true,
  });

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

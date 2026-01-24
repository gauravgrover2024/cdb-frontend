import { MongoClient } from "mongodb";

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in env");

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "cdrive");
    const col = db.collection("customers");

    // ✅ GET all customers
    if (req.method === "GET") {
      const rows = await col
        .find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      const normalized = rows.map((r) => ({
        ...r,
        _id: r._id.toString(),
      }));

      return res.status(200).json(normalized);
    }

    // ✅ POST create customer
    if (req.method === "POST") {
      const body = req.body || {};

      const payload = {
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await col.insertOne(payload);

      const created = await col.findOne({ _id: result.insertedId });

      return res.status(201).json({
        ...created,
        _id: created._id.toString(),
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("API /customers Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
    
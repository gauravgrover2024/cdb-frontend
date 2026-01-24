import { MongoClient, ObjectId } from "mongodb";

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
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: "customerId missing" });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "cdrive");
    const col = db.collection("customers");

    const isObjectId = ObjectId.isValid(customerId);

    const filter = isObjectId
      ? { _id: new ObjectId(customerId) }
      : { customerId };

    // ✅ GET single customer
    if (req.method === "GET") {
      const found = await col.findOne(filter);
      if (!found) return res.status(200).json(null);

      return res.status(200).json({
        ...found,
        _id: found._id.toString(),
      });
    }

    // ✅ PUT update single customer
    if (req.method === "PUT") {
      const body = req.body || {};
      delete body._id;

      const payload = {
        ...body,
        updatedAt: new Date().toISOString(),
      };

      const result = await col.updateOne(filter, { $set: payload });

      if (!result.matchedCount) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const updated = await col.findOne(filter);

      return res.status(200).json({
        ...updated,
        _id: updated._id.toString(),
      });
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("API /customers/[customerId] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

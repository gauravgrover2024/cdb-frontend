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
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const q = (req.query.q || "").trim();

    // if empty search, return empty array (no DB load)
    if (!q) return res.status(200).json([]);

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || "cdrive");
    const col = db.collection("customers");

    // ✅ Search fields (based on your existing customer form fields)
    const filter = {
      $or: [
        { customerName: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { customerId: { $regex: q, $options: "i" } },
        { customerNumber: { $regex: q, $options: "i" } },
        { primaryMobile: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    };

    const customers = await col
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();

    // ✅ always return JSON with _id as string
    const result = (customers || []).map((c) => ({
      ...c,
      _id: c._id?.toString?.() || c._id,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("API /customers/search Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

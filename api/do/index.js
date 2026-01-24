import { getDb } from "../../lib/mongodb";

export default async function handler(req, res) {
  const { method } = req;

  try {
    const db = await getDb();
    const collection = db.collection("delivery_orders");

    // ✅ GET: list all DOs (latest first)
    if (method === "GET") {
      const docs = await collection
        .find({})
        .sort({ updatedAt: -1 })
        .limit(500)
        .toArray();

      return res.status(200).json(docs || []);
    }

    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("DO List API Error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

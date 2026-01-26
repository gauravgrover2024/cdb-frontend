// pages/api/customers/index.js
import { getDb } from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const col = db.collection("customers");

    // ✅ GET all customers (dashboard list)
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

    // ✅ POST create customer (skeleton)
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") body = JSON.parse(body || "{}");
      if (!body || typeof body !== "object") body = {};

      const nowIso = new Date().toISOString();

      const payload = {
        ...body,
        createdAt: nowIso,
        updatedAt: nowIso,
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

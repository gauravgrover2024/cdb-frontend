import { getDb } from "../lib/mongodb";

export default async function handler(req, res) {
  const { method } = req;

  try {
    const db = await getDb();
    const collection = db.collection("loans");

    // ✅ GET: list all loans (latest first)
    if (method === "GET") {
      const docs = await collection
        .find({})
        .sort({ updatedAt: -1 })
        .limit(1000)
        .toArray();

      return res.status(200).json(docs || []);
    }

    // ✅ POST: create new loan
    if (method === "POST") {
      let payload = req.body;

      if (typeof payload === "string") payload = JSON.parse(payload);

      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ ok: false, error: "Invalid payload" });
      }

      const { _id, ...rest } = payload;

      const loanId =
        rest.loanId ||
        `LN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const doc = {
        ...rest,
        loanId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await collection.insertOne(doc);

      return res.status(201).json({ ok: true, loanId });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("Loans API Error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

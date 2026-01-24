import { getDb } from "../../../lib/mongodb";

export default async function handler(req, res) {
  const { method } = req;

  try {
    const db = await getDb();
    const collection = db.collection("loans");

    // ✅ GET: list loans
    if (method === "GET") {
      const docs = await collection
        .find({})
        .sort({ updatedAt: -1 })
        .limit(500)
        .toArray();

      return res.status(200).json(
        (docs || []).map((d) => ({
          ...d,
          _id: d._id.toString(),
        }))
      );
    }

    // ✅ POST: create new loan
    if (method === "POST") {
      let payload = req.body;

      if (typeof payload === "string") payload = JSON.parse(payload);

      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ ok: false, error: "Invalid payload" });
      }

      // never allow _id overwrite
      delete payload._id;

      // loanId required
      if (!payload.loanId) {
        return res.status(400).json({ ok: false, error: "loanId is required" });
      }

      const now = new Date().toISOString();

      const doc = {
        ...payload,
        createdAt: payload.createdAt || now,
        updatedAt: now,
      };

      // prevent duplicates
      const exists = await collection.findOne({ loanId: payload.loanId });
      if (exists) {
        return res.status(409).json({
          ok: false,
          error: `Loan already exists with loanId ${payload.loanId}`,
        });
      }

      await collection.insertOne(doc);

      return res.status(201).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("API /loans Error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

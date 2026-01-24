import { getDb } from "../../lib/mongodb";

export default async function handler(req, res) {
  const { loanId } = req.query;
  const { method } = req;

  if (!loanId || typeof loanId !== "string") {
    return res.status(400).json({ ok: false, error: "loanId is required" });
  }

  try {
    const db = await getDb();
    const collection = db.collection("delivery_orders");

    // ✅ GET: fetch DO by loanId
    if (method === "GET") {
      const doc = await collection.findOne({ loanId });
      return res.status(200).json(doc || null);
    }

    // ✅ PUT/POST: create or update DO by loanId (upsert)
    if (method === "PUT" || method === "POST") {
      let payload = req.body;

      // safety if body comes as string
      if (typeof payload === "string") {
        payload = JSON.parse(payload);
      }

      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ ok: false, error: "Invalid payload" });
      }

      // never allow _id overwrite
      const { _id, loanId: bodyLoanId, ...rest } = payload;

      const next = {
        ...rest,
        loanId,
        updatedAt: new Date().toISOString(),
      };

      await collection.updateOne(
        { loanId },
        {
          $set: next,
          $setOnInsert: { createdAt: new Date().toISOString() },
        },
        { upsert: true }
      );

      return res.status(200).json({ ok: true });
    }

    // ✅ DELETE: delete DO by loanId
    if (method === "DELETE") {
      await collection.deleteOne({ loanId });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "PUT", "POST", "DELETE"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("DO API Error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

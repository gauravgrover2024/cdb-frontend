import { getDb } from "../../lib/mongodb";

export default async function handler(req, res) {
  const { loanId } = req.query;
  const { method } = req;

  if (!loanId || typeof loanId !== "string") {
    return res.status(400).json({ ok: false, error: "loanId is required" });
  }

  try {
    const db = await getDb();
    const collection = db.collection("payments");

    if (method === "GET") {
      const doc = await collection.findOne({ loanId });
      return res.status(200).json(doc || null);
    }

    if (method === "POST" || method === "PUT") {
      let payload = req.body;

      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return res.status(400).json({ ok: false, error: "Invalid JSON" });
        }
      }

      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ ok: false, error: "Invalid payload" });
      }

      const { _id, ...rest } = payload;

      await collection.updateOne(
        { loanId },
        { $set: { ...rest, loanId } },
        { upsert: true }
      );

      return res.status(200).json({ ok: true });
    }

    if (method === "DELETE") {
      await collection.deleteOne({ loanId });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res
      .status(405)
      .json({ ok: false, error: `Method ${method} Not Allowed` });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}

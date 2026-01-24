import { getDb } from "../../../lib/mongodb";

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const cleanUndefined = (obj) => {
  if (!isPlainObject(obj)) return obj;

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
};

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

      // Vercel usually parses JSON automatically, but keep safe
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

      // Never allow _id overwrite
      const { _id, loanId: bodyLoanId, ...rest } = payload;

      // Get existing doc (merge-safe)
      const existing = (await collection.findOne({ loanId })) || {};

      // Merge logic:
      // - keep existing values if new value is null/undefined
      // - allow arrays to replace only if provided and is array
      // - allow objects to shallow-merge
      const next = { ...existing, ...cleanUndefined(rest) };

      // explicitly handle known array fields (only replace if valid array)
      if (Array.isArray(rest.showroomRows))
        next.showroomRows = rest.showroomRows;
      if (Array.isArray(rest.autocreditsRows))
        next.autocreditsRows = rest.autocreditsRows;

      // explicitly handle known object fields (merge)
      if (isPlainObject(rest.entryTotals)) {
        next.entryTotals = {
          ...(existing.entryTotals || {}),
          ...rest.entryTotals,
        };
      }

      if (isPlainObject(rest.autocreditsTotals)) {
        next.autocreditsTotals = {
          ...(existing.autocreditsTotals || {}),
          ...rest.autocreditsTotals,
        };
      }

      // always enforce correct loanId + timestamps
      next.loanId = loanId;
      next.updatedAt = new Date().toISOString();

      // keep createdAt stable
      if (!existing.createdAt) {
        next.createdAt = new Date().toISOString();
      }

      await collection.updateOne({ loanId }, { $set: next }, { upsert: true });

      return res.status(200).json({ ok: true });
    }

    if (method === "DELETE") {
      await collection.deleteOne({ loanId });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("Payments API Error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

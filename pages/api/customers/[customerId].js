// pages/api/customers/[customerId].js
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: "customerId missing" });
    }

    const db = await getDb();
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
      let body = req.body || {};
      if (typeof body === "string") {
        try {
          body = JSON.parse(body || "{}");
        } catch {
          body = {};
        }
      }

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

    // ✅ DELETE customer
    if (req.method === "DELETE") {
      await col.deleteOne(filter);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("API /customers/[customerId] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

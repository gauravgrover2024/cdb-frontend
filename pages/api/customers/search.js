import { getDb } from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(200).json([]);
    }

    const db = await getDb();
    const col = db.collection("customers");

    // search by name / mobile / customer number / customerId
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const customers = await col
      .find({
        $or: [
          { customerName: regex },
          { name: regex },
          { primaryMobile: regex },
          { phone: regex },
          { customerNumber: regex },
          { customerId: regex },
        ],
      })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();

    return res.status(200).json(
      customers.map((c) => ({
        ...c,
        _id: c._id?.toString?.(),
      }))
    );
  } catch (err) {
    console.error("API /customers/search Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

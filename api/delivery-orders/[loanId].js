// api/delivery-orders/[loanId].js
import { connectToDatabase } from "../../lib/mongodb";

export default async function handler(req, res) {
  const {
    query: { loanId },
    method,
  } = req;

  if (!loanId || typeof loanId !== "string") {
    res.status(400).json({ error: "loanId is required" });
    return;
  }

  const { db } = await connectToDatabase();
  const collection = db.collection("deliveryOrders");

  if (method === "GET") {
    const doc =
      (await collection.findOne({ loanId })) ||
      (await collection.findOne({ do_loanId: loanId }));
    res.status(200).json(doc || null);
    return;
  }

  if (method === "PUT" || method === "POST") {
    let payload = req.body;

    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        res.status(400).json({ error: "Invalid JSON payload" });
        return;
      }
    }

    if (!payload || typeof payload !== "object") {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const { _id, ...rest } = payload || {};

    const docLoanId = rest.do_loanId || rest.loanId || loanId;

    await collection.updateOne(
      { loanId: docLoanId },
      { $set: { ...rest, loanId: docLoanId } },
      { upsert: true }
    );

    res.status(200).json({ ok: true });
    return;
  }

  if (method === "DELETE") {
    await collection.deleteOne({ loanId });
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "POST", "DELETE"]);
  res.status(405).end(`Method ${method} Not Allowed`);
}

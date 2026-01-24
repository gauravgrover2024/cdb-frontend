import { connectToDatabase } from "../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    return res.status(200).json({ ok: true, message: "Mongo connected" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

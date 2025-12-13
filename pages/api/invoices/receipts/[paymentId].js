// pages/api/receipts/[paymentId].js
import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  const { paymentId } = req.query;
  if (!paymentId) return res.status(400).json({ error: "paymentId required" });

  // Path convention: receipts/receipts/<paymentId>.pdf
  const path = `receipts/receipts/${paymentId}.pdf`;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("receipts")
      .createSignedUrl(path, 60 * 10);

    if (error) {
      console.error("createSignedUrl receipt error", error);
      return res.status(404).json({ error: "Receipt not found" });
    }

    return res.status(200).json({ url: data.signedUrl });
  } catch (err) {
    console.error("receipts handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

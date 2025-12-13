// pages/api/invoices/[orderId].js
import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error: "orderId required" });

  // Path convention: invoices/invoices/<orderId>/invoice.pdf
  const path = `invoices/invoices/${orderId}/invoice.pdf`;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("invoices")
      .createSignedUrl(path, 60 * 10); // 10 minutes

    if (error) {
      console.error("createSignedUrl invoice error", error);
      return res.status(500).json({ error: "Failed to create signed url" });
    }

    return res.status(200).json({ url: data.signedUrl });
  } catch (err) {
    console.error("invoices handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { getSupabase } from "../../_supabase";

export default async function handler(req, res) {
  const { paymentId } = req.query;
  const supabase = getSupabase();

  const { data: payment, error } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      payment_mode,
      created_at,
      orders (
        id,
        buyer_name
      )
    `)
    .eq("id", paymentId)
    .single();

  if (error || !payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=receipt-${paymentId}.pdf`
  );
  doc.pipe(res);

  /* ===== BRANDING ===== */
  const logoPath = path.join(process.cwd(), "public", "cienergy-logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 120 });
  }

  doc
    .fontSize(20)
    .text("PAYMENT RECEIPT", 0, 50, { align: "right" })
    .moveDown(2);

  /* ===== META ===== */
  doc.fontSize(11);
  doc.text(`Receipt ID: ${payment.id}`);
  doc.text(`Order ID: ${payment.orders.id}`);
  doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`);
  doc.moveDown();

  /* ===== PAYMENT INFO ===== */
  doc.fontSize(13).text("Payment Details", { underline: true });
  doc.fontSize(11);
  doc.text(`Buyer: ${payment.orders.buyer_name || "—"}`);
  doc.text(`Payment Mode: ${payment.payment_mode}`);
  doc.text(`Amount Paid: ₹${payment.amount.toLocaleString("en-IN")}`);
  doc.moveDown();

  /* ===== FOOTER ===== */
  doc
    .moveDown(2)
    .fontSize(9)
    .fillColor("gray")
    .text(
      "Cienergy™ • Carbon Impact Capital • This is a system-generated receipt.",
      { align: "center" }
    );

  doc.end();
}

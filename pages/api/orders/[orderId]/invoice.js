import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { getSupabase } from "../../_supabase";

export default async function handler(req, res) {
  const { orderId } = req.query;
  const supabase = getSupabase();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      buyer_name,
      buyer_contact,
      region,
      order_batches (
        product_name,
        qty,
        price_per_kg
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${orderId}.pdf`
  );
  doc.pipe(res);

  /* ===== BRANDING ===== */
  const logoPath = path.join(process.cwd(), "public", "cienergy-logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 120 });
  }

  doc
    .fontSize(20)
    .text("INVOICE", 0, 50, { align: "right" })
    .moveDown(2);

  /* ===== META ===== */
  doc.fontSize(11);
  doc.text(`Invoice ID: ${order.id}`);
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
  doc.moveDown();

  /* ===== BILL TO ===== */
  doc.fontSize(13).text("Billed To", { underline: true });
  doc.fontSize(11);
  doc.text(order.buyer_name || "—");
  doc.text(order.buyer_contact || "—");
  doc.text(`Region: ${order.region || "—"}`);
  doc.moveDown();

  /* ===== ITEMS ===== */
  doc.fontSize(13).text("Order Details", { underline: true });
  doc.moveDown(0.5);

  let subtotal = 0;

  order.order_batches.forEach((item) => {
    const amount = item.qty * item.price_per_kg;
    subtotal += amount;

    doc
      .fontSize(11)
      .text(
        `${item.product_name}  |  ${item.qty} kg × ₹${item.price_per_kg}  =  ₹${amount.toLocaleString(
          "en-IN"
        )}`
      );
  });

  doc.moveDown();
  doc
    .fontSize(12)
    .text(`Subtotal: ₹${subtotal.toLocaleString("en-IN")}`, {
      align: "right",
    });

  /* ===== FOOTER ===== */
  doc
    .moveDown(2)
    .fontSize(9)
    .fillColor("gray")
    .text(
      "Cienergy™ • Carbon Impact Capital • This is a system-generated invoice.",
      { align: "center" }
    );

  doc.end();
}

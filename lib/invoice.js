// lib/invoice.js
import PDFDocument from "pdfkit";

/**
 * Generate a simple invoice PDF as Buffer.
 * @param {Object} order - order object (id, created_at, buyer_name, buyer_id, region, transport_mode)
 * @param {Array} batches - array of batch rows [{ product_name, qty, price_per_kg, scheduled_date }]
 * @param {Array} payments - array of payments [{ amount, payment_mode, created_at, id }]
 * @returns {Promise<Buffer>}
 */
export function generateInvoiceBuffer(order = {}, batches = [], payments = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header
      doc.fontSize(20).text("Cienergy — Invoice", { align: "left" });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#444").text(`Invoice for order: ${order.id || "-"}`);
      doc.text(`Date: ${order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString()}`);
      doc.moveDown(0.6);

      // Buyer info
      doc.fontSize(12).fillColor("#000").text("Bill to:", { underline: true });
      doc.fontSize(10).fillColor("#222");
      const buyerLine = order.buyer_name ? `${order.buyer_name}` : `Buyer ID: ${order.buyer_id || "-"}`;
      doc.text(buyerLine);
      if (order.region) doc.text(`Region: ${order.region}`);
      if (order.transport_mode) doc.text(`Transport: ${order.transport_mode}`);
      doc.moveDown(0.8);

      // Items table header
      doc.fontSize(11).text("Items", { underline: true });
      doc.moveDown(0.3);

      // Table columns: description | qty | unit price | line total
      const tableTop = doc.y;
      const colDescX = 40;
      const colQtyX = 340;
      const colUnitX = 400;
      const colTotalX = 480;

      doc.fontSize(10).text("Description", colDescX, tableTop, { bold: true });
      doc.text("Qty (kg)", colQtyX, tableTop);
      doc.text("Unit (₹/kg)", colUnitX, tableTop);
      doc.text("Total (₹)", colTotalX, tableTop);

      doc.moveTo(colDescX, tableTop + 15).lineTo(550, tableTop + 15).strokeColor("#eeeeee").stroke();
      doc.moveDown(0.4);

      let subtotal = 0;
      batches.forEach((row, idx) => {
        const y = doc.y;
        const desc = row.product_name || row.product_id || `Item ${idx + 1}`;
        const qty = Number(row.qty || 0);
        const unit = Number(row.price_per_kg || 0);
        const line = qty * unit;
        subtotal += line;

        doc.fontSize(10).fillColor("#222").text(desc, colDescX, y, { width: colQtyX - colDescX - 4 });
        doc.text(qty.toFixed(2), colQtyX, y);
        doc.text(unit.toFixed(2), colUnitX, y);
        doc.text(line.toFixed(2), colTotalX, y);
        doc.moveDown(0.8);
      });

      doc.moveDown(0.4);
      const tax = Math.round((subtotal) * 0.12 * 100) / 100; // 12% GST approx
      const total = Math.round((subtotal + tax) * 100) / 100;

      doc.moveDown(0.6);
      const rightX = 420;
      doc.text(`Subtotal: ₹ ${subtotal.toFixed(2)}`, rightX, doc.y);
      doc.moveDown(0.3);
      doc.text(`Tax (12%): ₹ ${tax.toFixed(2)}`, rightX, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(12).font("Helvetica-Bold").text(`Total: ₹ ${total.toFixed(2)}`, rightX, doc.y);
      doc.font("Helvetica").moveDown(1);

      // Payments summary
      doc.moveDown(0.6);
      doc.fontSize(11).text("Payments", { underline: true });
      doc.moveDown(0.3);
      if (!payments || payments.length === 0) {
        doc.fontSize(10).fillColor("#6b7280").text("No payments recorded.");
      } else {
        payments.forEach((p) => {
          doc.fontSize(10).fillColor("#222").text(`₹ ${Number(p.amount || 0).toFixed(2)} — ${p.payment_mode || "manual"} — ${p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}`);
        });
      }

      doc.moveDown(1.2);
      doc.fontSize(9).fillColor("#6b7280").text("This is a system generated invoice.", { align: "left" });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

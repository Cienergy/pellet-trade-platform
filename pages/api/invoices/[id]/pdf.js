import requireAuth from "../../../../lib/requireAuth";
import { prisma } from "../../../../lib/prisma";
import PDFDocument from "pdfkit";

function formatINR(amount) {
  const n = Number(amount || 0);
  return `INR ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const invoiceId = req.query.id;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      batch: {
        include: {
          product: true,
          site: true,
          order: { include: { org: true } },
        },
      },
      payments: true,
    },
  });

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  // IMPORTANT: Authorization — buyers can only download invoices for their org
  const session = req.session;
  if (session?.role === "BUYER") {
    const orgId = invoice.batch?.order?.orgId;
    if (!orgId || orgId !== session.orgId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const filenameSafe = (invoice.number || invoice.id).replace(/[^a-zA-Z0-9-_]/g, "_");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filenameSafe}.pdf\"`);

  doc.pipe(res);

  // Header
  doc.fontSize(18).font("Helvetica-Bold").text("Cienergy", { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(11).font("Helvetica").fillColor("#4b5563").text("Pellet Trading Platform", { align: "left" });
  doc.fillColor("#111827");
  doc.moveDown(1);

  doc.fontSize(16).font("Helvetica-Bold").text(`Invoice ${invoice.number || ""}`.trim());
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica").fillColor("#4b5563").text(`Invoice ID: ${invoice.id}`);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`);
  doc.fillColor("#111827");

  doc.moveDown(1);
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#e5e7eb").stroke();
  doc.moveDown(1);

  // Buyer / Order info
  const orgName = invoice.batch?.order?.org?.name || "-";
  const deliveryLocation = invoice.batch?.order?.deliveryLocation || "-";
  const productName = invoice.batch?.product?.name || "-";
  const siteName = invoice.batch?.site?.name || "-";
  const qty = invoice.batch?.quantityMT ?? 0;

  doc.fontSize(12).font("Helvetica-Bold").text("Order Details");
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica");
  doc.text(`Buyer: ${orgName}`);
  doc.text(`Delivery location: ${deliveryLocation}`);
  doc.text(`Factory site: ${siteName}`);
  doc.text(`Product: ${productName}`);
  doc.text(`Batch quantity: ${Number(qty).toFixed(2)} MT`);

  doc.moveDown(1);
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#e5e7eb").stroke();
  doc.moveDown(1);

  // Amounts
  doc.fontSize(12).font("Helvetica-Bold").text("Amount Summary");
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica");
  doc.text(`Subtotal: ${formatINR(invoice.subtotal)}`);
  doc.text(`GST (${invoice.gstType} @ ${invoice.gstRate}%): ${formatINR(invoice.gstAmount)}`);
  doc.moveDown(0.2);
  doc.fontSize(12).font("Helvetica-Bold").text(`Total: ${formatINR(invoice.totalAmount)}`);

  // Payments
  const verifiedPaid = (invoice.payments || [])
    .filter((p) => p.verified)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingPaid = (invoice.payments || [])
    .filter((p) => !p.verified)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = Math.max(0, Number(invoice.totalAmount || 0) - verifiedPaid);

  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica-Bold").text("Payments");
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica");
  doc.text(`Verified: ${formatINR(verifiedPaid)}`);
  doc.text(`Pending verification: ${formatINR(pendingPaid)}`);
  doc.text(`Remaining: ${formatINR(remaining)}`);

  doc.moveDown(2);
  doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text("This is a system-generated invoice summary for operational use.", { align: "left" });

  doc.end();
}

export default requireAuth(handler);



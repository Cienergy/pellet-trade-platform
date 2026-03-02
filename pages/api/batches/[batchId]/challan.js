import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import PDFDocument from "pdfkit";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { batchId } = req.query;

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      product: true,
      site: true,
      order: { include: { org: true } },
    },
  });

  if (!batch) return res.status(404).json({ error: "Batch not found" });

  const session = req.session;
  if (session?.role === "BUYER") {
    if (batch.order?.orgId !== session.orgId) return res.status(403).json({ error: "Forbidden" });
  }

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const safeId = (batch.id || "challan").replace(/[^a-zA-Z0-9-_]/g, "_");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="delivery-challan-${safeId}.pdf"`);

  doc.pipe(res);

  doc.fontSize(18).font("Helvetica-Bold").text("Delivery Challan", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("#4b5563");
  doc.text(`Challan for Batch: ${batch.id}`);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
  doc.fillColor("#111827");
  doc.moveDown(1);

  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#e5e7eb").stroke();
  doc.moveDown(1);

  const fromSite = batch.site?.name || "-";
  const fromAddress = batch.site ? [batch.site.city, batch.site.state].filter(Boolean).join(", ") : "-";
  const toBuyer = batch.order?.org?.name || "-";
  const toLocation = batch.order?.deliveryLocation || "-";
  const buyerState = batch.order?.org?.state || "-";

  doc.fontSize(12).font("Helvetica-Bold").text("Consignor (From)");
  doc.fontSize(10).font("Helvetica");
  doc.text(`Site: ${fromSite}`);
  doc.text(fromAddress);
  doc.moveDown(1);

  doc.fontSize(12).font("Helvetica-Bold").text("Consignee (To)");
  doc.fontSize(10).font("Helvetica");
  doc.text(`Buyer: ${toBuyer}`);
  doc.text(`Delivery location: ${toLocation}`);
  doc.text(`State: ${buyerState}`);
  doc.moveDown(1);

  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#e5e7eb").stroke();
  doc.moveDown(1);

  doc.fontSize(12).font("Helvetica-Bold").text("Particulars");
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica");
  doc.text(`Product: ${batch.product?.name || "-"}`);
  doc.text(`Quantity: ${Number(batch.quantityMT).toFixed(2)} MT`);
  if (batch.eWayBillNumber) doc.text(`E-way bill no.: ${batch.eWayBillNumber}`);
  if (batch.eWayBillDate) doc.text(`E-way bill date: ${new Date(batch.eWayBillDate).toLocaleDateString("en-IN")}`);
  doc.text(`Order ID: ${batch.orderId}`);
  doc.moveDown(1);

  doc.fontSize(9).fillColor("#6b7280");
  doc.text("This is a computer-generated delivery challan. Generated from Pellet Trade Platform.");
  doc.end();
}

export default requireAuth(requireRole(["OPS", "ADMIN", "FINANCE", "BUYER"], handler));

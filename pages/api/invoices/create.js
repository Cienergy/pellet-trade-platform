import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { calculateGST } from "../../../lib/gst";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { batchId, gstRate = 12, paymentTerm = "NET_30" } = req.body;

  if (!batchId) {
    return res.status(400).json({ error: "batchId is required" });
  }

  // Enforce payment terms: NET_30, NET_60, or NET_90 only
  const validPaymentTerms = ["NET_30", "NET_60", "NET_90"];
  if (!validPaymentTerms.includes(paymentTerm)) {
    return res.status(400).json({ 
      error: `Invalid payment term. Must be one of: ${validPaymentTerms.join(", ")}` 
    });
  }

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      product: true,
      site: true,
      order: {
        include: {
          org: true,
        },
      },
    },
  });

  if (!batch) {
    return res.status(404).json({ error: "Batch not found" });
  }

  if (!batch.order?.org) {
    return res.status(404).json({ error: "Order organization not found" });
  }

  // Check if invoice already exists
  const existingInvoice = await prisma.invoice.findUnique({
    where: { batchId: batch.id },
  });

  if (existingInvoice) {
    return res.status(400).json({ error: "Invoice already exists for this batch" });
  }

  // Calculate transaction value (Quantity × Price)
  const transactionValue = batch.quantityMT * batch.product.pricePMT;
  
  // Auto-classify intra/inter-state and calculate GST
  const gstCalculation = calculateGST({
    transactionValue,
    buyerState: batch.order.org.state,
    sellerState: batch.site.state,
    gstRate,
  });

  // Generate invoice number
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${String(Date.now()).slice(-6)}`;

  const invoice = await prisma.invoice.create({
    data: {
      batchId: batch.id,
      number: invoiceNumber,
      subtotal: transactionValue,
      gstType: gstCalculation.gstType,
      gstRate: gstCalculation.gstRate,
      gstAmount: gstCalculation.gstAmount,
      cgst: gstCalculation.cgst,
      sgst: gstCalculation.sgst,
      igst: gstCalculation.igst,
      totalAmount: gstCalculation.totalAmount,
      paymentTerm: paymentTerm,
      status: "CREATED",
    },
  });

  // Update batch status to INVOICED
  await prisma.orderBatch.update({
    where: { id: batch.id },
    data: { status: "INVOICED" },
  });

  return res.status(201).json(invoice);
}

export default requireAuth(
  requireRole("FINANCE", handler)
);

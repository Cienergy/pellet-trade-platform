import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { calculateGST } from "../../../lib/gst";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { batchId, gstRate = 12, paymentTerm: bodyPaymentTerm } = req.body;

  if (!batchId) {
    return res.status(400).json({ error: "batchId is required" });
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

  // Use buyer default payment term if not provided; enforce NET_15, NET_30, NET_60, NET_90 only
  const validPaymentTerms = ["NET_15", "NET_30", "NET_60", "NET_90"];
  const orgDefault = batch.order.org.defaultPaymentTerm;
  const paymentTerm = validPaymentTerms.includes(bodyPaymentTerm)
    ? bodyPaymentTerm
    : (orgDefault && validPaymentTerms.includes(orgDefault) ? orgDefault : "NET_30");
  if (!validPaymentTerms.includes(paymentTerm)) {
    return res.status(400).json({
      error: `Invalid payment term. Must be one of: ${validPaymentTerms.join(", ")}`,
    });
  }

  const existing = await prisma.invoice.findFirst({
    where: { batchId: batch.id },
  });
  if (existing) {
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

  const org = batch.order.org;
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
      invoiceType: "STANDARD",
      earlyPayDiscountPercent: org.earlyPayDiscountPercent ?? undefined,
      earlyPayDiscountDays: org.earlyPayDiscountDays ?? undefined,
      retentionPercent: org.retentionPercent ?? undefined,
      retentionDueDate: org.retentionDays != null && batch.deliveryAt
        ? (() => { const d = new Date(batch.deliveryAt); d.setDate(d.getDate() + org.retentionDays); return d; })()
        : undefined,
    },
  });

  // Update batch status to INVOICED
  await prisma.orderBatch.update({
    where: { id: batch.id },
    data: { status: "INVOICED" },
  });

  const { logAudit } = await import("../../../lib/audit");
  await logAudit({
    actorId: req.session?.userId,
    entity: "invoice",
    entityId: invoice.id,
    action: "created",
  });

  return res.status(201).json(invoice);
}

export default requireAuth(
  requireRole("FINANCE", handler)
);

import { PrismaClient } from "@prisma/client";
import { calculateGST } from "../gst";

const prisma = new PrismaClient();

export async function generateInvoice(ctx, input) {
  if (!["FINANCE", "ADMIN"].includes(ctx.role)) {
    throw new Error("Unauthorized");
  }

  const batch = await prisma.orderBatch.findUnique({
    where: { id: input.batchId },
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

  if (!batch) throw new Error("Batch not found");
  if (!batch.order?.org) throw new Error("Order organization not found");

  // Calculate transaction value (Quantity × Price)
  const transactionValue = batch.quantityMT * batch.product.pricePMT;
  
  // Auto-classify intra/inter-state and calculate GST
  const gstCalculation = calculateGST({
    transactionValue,
    buyerState: batch.order.org.state,
    sellerState: batch.site.state,
    gstRate: input.gstRate || 12,
  });

  // Enforce payment term (NET_30, NET_60, or NET_90 only)
  const validPaymentTerms = ["NET_30", "NET_60", "NET_90"];
  const paymentTerm = validPaymentTerms.includes(input.paymentTerm) 
    ? input.paymentTerm 
    : "NET_30"; // Default to NET_30 if invalid

  // Generate invoice number
  const invoiceNumber = input.number || `INV-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${String(Date.now()).slice(-6)}`;

  return prisma.invoice.create({
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
}

export async function recordPayment(ctx, input) {
  if (!["BUYER", "FINANCE", "ADMIN"].includes(ctx.role)) {
    throw new Error("Unauthorized");
  }

  return prisma.payment.create({
    data: {
      invoiceId: input.invoiceId,
      amount: input.amount,
      mode: input.mode,
      proofUrl: input.proofUrl,
      verified: ctx.role !== "BUYER",
    },
  });
}

export async function listInvoices(ctx) {
  if (!["FINANCE", "ADMIN"].includes(ctx.role)) {
    throw new Error("Unauthorized");
  }

  return prisma.invoice.findMany({
    include: {
      batch: {
        include: {
          product: true,
          site: true,
          order: true,
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

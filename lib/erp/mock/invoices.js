import { PrismaClient } from "@prisma/client";

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
      order: true,
    },
  });

  if (!batch) throw new Error("Batch not found");

  const subtotal = batch.quantityMT * batch.product.pricePMT;
  const gstAmount = (subtotal * input.gstRate) / 100;

  return prisma.invoice.create({
    data: {
      batchId: batch.id,
      number: `INV-${Date.now()}`,
      subtotal,
      gstType: input.gstType,
      gstRate: input.gstRate,
      gstAmount,
      totalAmount: subtotal + gstAmount,
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

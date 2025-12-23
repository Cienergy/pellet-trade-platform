const { prisma } = require("../../../../lib/prisma");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { orderId } = req.query;
  const { productId, quantityMT, deliveryAt, amount } = req.body;

  if (!productId || !quantityMT || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const batch = await prisma.orderBatch.create({
    data: {
      orderId,
      productId,
      quantityMT,
      deliveryAt: deliveryAt ? new Date(deliveryAt) : null,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      batchId: batch.id,
      number: `INV-${Date.now()}`,
      amount,
      status: "pending",
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "invoice",
      entityId: invoice.id,
      action: "auto_created",
    },
  });

  return res.status(201).json({ batch, invoice });
}

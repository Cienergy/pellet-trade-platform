const { prisma } = require("../../../lib/prisma");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { invoiceId, amount, mode, proofUrl } = req.body;

  if (!invoiceId || !amount || !mode) {
    return res.status(400).json({ error: "Invalid payment payload" });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      mode,
      proofUrl,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "payment",
      entityId: payment.id,
      action: "created",
    },
  });

  return res.status(201).json(payment);
}

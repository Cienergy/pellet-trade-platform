import requireAuth from "../../lib/requireAuth";
import prisma from "../../lib/prisma";
import { logAudit } from "../../lib/audit";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const session = req.session;
  const { invoiceId, amount, mode, proofUrl } = req.body;

  if (!invoiceId || !amount || !mode || !proofUrl) {
    return res.status(400).json({
      error: "invoiceId, amount, mode, and proofUrl are required",
    });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: Number(amount),
      mode,
      proofUrl,
      verified: session.role !== "BUYER", // Auto-verify if not buyer
    },
  });

  await logAudit({
    actorId: session.userId,
    entity: "payment",
    entityId: payment.id,
    action: "created",
  });

  return res.status(201).json(payment);
}

export default requireAuth(handler);

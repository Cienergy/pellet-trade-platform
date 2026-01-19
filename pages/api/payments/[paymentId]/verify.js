import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { paymentId } = req.query;
  const session = req.session;

  const { approve } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          batch: true,
        },
      },
    },
  });

  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  // Update payment verification status
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: { verified: approve !== false },
  });

  // If payment is approved, update batch status to PAYMENT_APPROVED
  if (approve !== false && payment.invoice?.batch) {
    await prisma.orderBatch.update({
      where: { id: payment.invoice.batch.id },
      data: { status: "PAYMENT_APPROVED" },
    });
  }

  await prisma.auditLog.create({
    data: {
      entity: "payment",
      entityId: payment.id,
      action: approve !== false ? "verified" : "rejected",
      actorId: session.userId,
    },
  });

  return res.json(updatedPayment);
}

export default requireAuth(
  requireRole(["ADMIN", "FINANCE"], handler)
);

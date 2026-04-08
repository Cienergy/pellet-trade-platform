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
          payments: true,
        },
      },
    },
  });

  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      verified: approve !== false,
      verifiedAt: approve !== false ? new Date() : null,
    },
  });

  if (approve !== false && payment.invoice?.batch) {
    const batchId = payment.invoice.batch.id;
    const inv = payment.invoice;
    if (inv.invoiceType === "ADVANCE") {
      const fresh = await prisma.invoice.findUnique({
        where: { id: inv.id },
        include: { payments: true },
      });
      const paid = (fresh?.payments || []).filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);
      if (paid >= (fresh?.totalAmount ?? 0)) {
        await prisma.orderBatch.update({
          where: { id: batchId },
          data: { status: "PAYMENT_APPROVED" },
        });
      }
    } else {
      await prisma.orderBatch.update({
        where: { id: batchId },
        data: { status: "PAYMENT_APPROVED" },
      });
    }
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

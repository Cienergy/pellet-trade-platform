import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { paymentId } = req.query;
  const session = req.session;

  const { approve } = req.body;

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { verified: approve !== false },
  });

  await prisma.auditLog.create({
    data: {
      entity: "payment",
      entityId: payment.id,
      action: "verified",
      actorId: session.userId,
    },
  });

  return res.json(payment);
}

export default requireAuth(
  requireRole(["ADMIN", "FINANCE"], handler)
);

const { prisma } = require("../../../../lib/prisma");

export default requireAuth(
  requireRole(["admin", "finance"])(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // TEMP: replace with real auth later
  const userRole = req.headers["x-user-role"];

  if (userRole !== "finance" && userRole !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { paymentId } = req.query;

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { verified: true },
  });

  await prisma.auditLog.create({
    data: {
      entity: "payment",
      entityId: payment.id,
      action: "verified",
    },
  });

  return res.json(payment);
}))

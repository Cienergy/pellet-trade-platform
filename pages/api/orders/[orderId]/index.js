import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { requireRole } from "../../../lib/requireRole";

async function handler(req, res) {
  const { orderId } = req.query;
  const user = req.user;

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      batches: {
        include: {
          product: true,
          invoice: {
            include: { payments: true },
          },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (user.role === "buyer" && order.orgId !== user.orgId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.status(200).json(order);
}

export default requireAuth(
  requireRole(["admin", "ops", "finance", "buyer"])(handler)
);

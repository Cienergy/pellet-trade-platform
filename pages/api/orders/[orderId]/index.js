import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const { orderId } = req.query;
  const session = req.session;

  if (req.method === "GET") {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        batches: {
          include: {
            product: true,
            site: true,
            invoice: {
              include: { payments: true },
            },
          },
        },
        org: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (session.role === "BUYER" && order.orgId !== session.orgId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json(order);
  }

  if (req.method === "PATCH") {
    if (session.role !== "OPS" && session.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    await logAudit({
      actorId: session.userId,
      entity: "order",
      entityId: order.id,
      action: `status_updated_to_${status}`,
    });

    return res.status(200).json(order);
  }

  return res.status(405).end();
}

export default requireAuth(
  requireRole(["ADMIN", "OPS", "FINANCE", "BUYER"], handler)
);

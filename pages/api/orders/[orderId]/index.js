import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  const { orderId } = req.query;
  const session = req.session;

  if (req.method === "GET") {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          batches: {
            include: {
              product: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          org: true,
          invoice: {
            include: {
              payments: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (session.role === "BUYER" && order.orgId !== session.orgId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.status(200).json(order);
    } catch (err) {
      console.error("GET ORDER ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch order" });
    }
  }

  if (req.method === "PATCH") {
    try {
      if (session.role !== "OPS" && session.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          batches: {
            include: {
              product: true,
            },
          },
          org: true,
        },
      });

      await logAudit({
        actorId: session.userId,
        entity: "order",
        entityId: order.id,
        action: `status_updated_to_${status}`,
      });

      return res.status(200).json(order);
    } catch (err) {
      console.error("UPDATE ORDER ERROR:", err);
      return res.status(500).json({ error: "Failed to update order" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(
  requireRole(["ADMIN", "OPS", "FINANCE", "BUYER"], handler)
);
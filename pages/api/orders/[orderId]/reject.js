import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  const { orderId } = req.query;
  const session = req.session;

  if (req.method === "POST") {
    try {
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      // Check if order exists and is pending approval
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status !== "PENDING_APPROVAL") {
        return res.status(400).json({ 
          error: `Order cannot be rejected. Current status: ${order.status}` 
        });
      }

      // Update order status to REJECTED with reason
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: "REJECTED",
          rejectionReason: reason.trim(),
        },
        include: {
          org: true,
          creator: true,
        },
      });

      await logAudit({
        actorId: session.userId,
        entity: "order",
        entityId: orderId,
        action: "rejected",
        metadata: { reason: reason.trim() },
      });

      return res.status(200).json(updatedOrder);
    } catch (err) {
      console.error("REJECT ORDER ERROR:", err);
      return res.status(500).json({ error: err.message || "Failed to reject order" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(requireRole(["ADMIN", "OPS"], handler));


import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  const { batchId } = req.query;
  const session = req.session;

  if (req.method === "PATCH") {
    try {
      const { leftFromSite } = req.body;
      
      // Update batch status to COMPLETED and track when it left the site
      const batch = await prisma.orderBatch.update({
        where: { id: batchId },
        data: { 
          status: "COMPLETED",
          leftFromSiteAt: leftFromSite ? new Date() : null,
        },
        include: {
          order: {
            include: {
              batches: true,
            },
          },
        },
      });

      // Check if all batches are completed
      const allBatchesCompleted = batch.order.batches.every(
        (b) => b.status === "COMPLETED"
      );

      // Calculate total batched quantity
      const totalBatchedMT = batch.order.batches.reduce(
        (sum, b) => sum + b.quantityMT,
        0
      );
      const requestedMT = batch.order.requestedQuantityMT || 0;

      // Order should only be marked as COMPLETED if:
      // 1. All batches are completed AND
      // 2. Total batched quantity meets or exceeds requested quantity
      const shouldCompleteOrder = allBatchesCompleted && 
                                  requestedMT > 0 && 
                                  totalBatchedMT >= requestedMT;

      if (shouldCompleteOrder) {
        await prisma.order.update({
          where: { id: batch.orderId },
          data: { status: "COMPLETED" },
        });
      }

      await logAudit({
        actorId: session.userId,
        entity: "orderBatch",
        entityId: batchId,
        action: "completed",
      });

      return res.status(200).json({
        batch,
        orderCompleted: shouldCompleteOrder,
        allBatchesCompleted,
        totalBatchedMT,
        requestedMT,
        remainingMT: Math.max(0, requestedMT - totalBatchedMT),
      });
    } catch (err) {
      console.error("COMPLETE BATCH ERROR:", err);
      return res.status(500).json({ error: err.message || "Failed to complete batch" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
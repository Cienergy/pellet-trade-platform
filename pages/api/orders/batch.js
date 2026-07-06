import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

/**
 * Legacy batch create route. Prefer POST /api/orders/[orderId]/batches.
 * Restricted to OPS/ADMIN — unauthenticated access was a security issue.
 */
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, productId, siteId, quantityMT, deliveryAt, createdBy } = req.body;
  const session = req.session;

  if (!orderId || !productId || !quantityMT) {
    return res.status(400).json({ error: "Missing required fields: orderId, productId, quantityMT" });
  }

  if (!siteId) {
    return res.status(400).json({
      error: "siteId is required. Prefer POST /api/orders/[orderId]/batches for batch creation.",
    });
  }

  try {
    const batch = await prisma.orderBatch.create({
      data: {
        orderId,
        productId,
        siteId,
        quantityMT: Number(quantityMT),
        deliveryAt: deliveryAt ? new Date(deliveryAt) : null,
        createdBy: createdBy || session.userId,
      },
    });

    await logAudit({
      actorId: session.userId,
      req,
      entity: "orderBatch",
      entityId: batch.id,
      action: "created",
    });

    return res.status(201).json(batch);
  } catch (err) {
    console.error("Batch create error:", err);
    return res.status(500).json({ error: err.message || "Failed to create batch" });
  }
}

export default requireAuth(requireRole(["ADMIN", "OPS"], handler));

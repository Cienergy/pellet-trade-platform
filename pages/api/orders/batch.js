import prisma from "../../../lib/prisma";

/**
 * Legacy batch create route. For full batch creation (with siteId, createdBy, inventory)
 * use POST /api/orders/[orderId]/batches instead.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, productId, siteId, quantityMT, deliveryAt, createdBy } = req.body;

  if (!orderId || !productId || !quantityMT) {
    return res.status(400).json({ error: "Missing required fields: orderId, productId, quantityMT" });
  }

  if (!siteId || !createdBy) {
    return res.status(400).json({
      error: "siteId and createdBy are required. Prefer POST /api/orders/[orderId]/batches for batch creation.",
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
        createdBy,
      },
    });

    const { logAudit } = await import("../../../lib/audit");
    await logAudit({
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

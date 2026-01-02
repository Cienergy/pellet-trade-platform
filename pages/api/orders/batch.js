import { prisma } from "../../../lib/prisma";
import { reserveInventory } from "../../../lib/inventory";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, productId, quantityMT, deliveryAt } = req.body;

  if (!orderId || !productId || !quantityMT) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await reserveInventory(productId, quantityMT);

    const batch = await prisma.orderBatch.create({
      data: {
        orderId,
        productId,
        quantityMT,
        deliveryAt: deliveryAt ? new Date(deliveryAt) : null
      }
    });

    await prisma.auditLog.create({
      data: {
        entity: "OrderBatch",
        entityId: batch.id,
        action: "CREATED_AND_RESERVED"
      }
    });

    return res.status(201).json(batch);
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }
}

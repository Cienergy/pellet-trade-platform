import { prisma } from "../../../../lib/prisma";
import { reserveInventoryOrFail } from "../../../../lib/inventory";
import { requireAuth } from "../../../../lib/requireAuth";
import { requireRole } from "../../../../lib/requireRole";

export default requireAuth(
  requireRole(["admin", "ops"])(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.query;
  const { productId, quantityMT, deliveryAt } = req.body;

  if (!productId || !quantityMT) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const batch = await prisma.$transaction(async (tx) => {
      // 1. Lock & reserve inventory
      await reserveInventoryOrFail(tx, productId, quantityMT);

      // 2. Create batch ONLY after inventory lock
      const createdBatch = await tx.orderBatch.create({
        data: {
          orderId,
          productId,
          quantityMT,
          deliveryAt: deliveryAt ? new Date(deliveryAt) : null
        }
      });

      // 3. Audit
      await tx.auditLog.create({
        data: {
          entity: "OrderBatch",
          entityId: createdBatch.id,
          action: "CREATED_WITH_INVENTORY_LOCK"
        }
      });

      return createdBatch;
    });

    return res.status(201).json(batch);
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }
}
))

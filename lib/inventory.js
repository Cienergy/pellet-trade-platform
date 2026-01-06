import { prisma } from "./prisma";

/**
 * Atomically reserve inventory.
 * Safe under concurrency.
 */
export async function reserveInventoryOrFail(tx, productId, quantityMT) {
  const result = await tx.inventory.updateMany({
    where: {
      productId,
      availableMT: {
        gte: quantityMT
      }
    },
    data: {
      availableMT: {
        decrement: quantityMT
      },
      reservedMT: {
        increment: quantityMT
      }
    }
  });

  // If no rows updated, inventory was insufficient
  if (result.count === 0) {
    throw new Error("Insufficient inventory");
  }
}

/**
 * Release inventory (used on rollback/cancel).
 */
export async function releaseInventory(tx, productId, quantityMT) {
  await tx.inventory.updateMany({
    where: { productId },
    data: {
      availableMT: {
        increment: quantityMT
      },
      reservedMT: {
        decrement: quantityMT
      }
    }
  });
}

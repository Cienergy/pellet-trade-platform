import { prisma } from "./prisma";

/**
 * Reserve inventory atomically.
 * MUST be called inside a Prisma transaction.
 * Throws error if insufficient stock.
 */
export async function reserveInventoryOrFail(tx, productId, quantityMT) {
  const inventory = await tx.inventory.findUnique({
    where: { productId },
    lock: { mode: "ForUpdate" }
  });

  if (!inventory) {
    throw new Error("Inventory not initialized for product");
  }

  if (inventory.availableMT < quantityMT) {
    throw new Error("Insufficient inventory");
  }

  await tx.inventory.update({
    where: { productId },
    data: {
      availableMT: inventory.availableMT - quantityMT,
      reservedMT: inventory.reservedMT + quantityMT
    }
  });
}

/**
 * Release inventory (used on cancel/failure).
 */
export async function releaseInventory(tx, productId, quantityMT) {
  const inventory = await tx.inventory.findUnique({
    where: { productId }
  });

  if (!inventory) return;

  await tx.inventory.update({
    where: { productId },
    data: {
      availableMT: inventory.availableMT + quantityMT,
      reservedMT: Math.max(0, inventory.reservedMT - quantityMT)
    }
  });
}

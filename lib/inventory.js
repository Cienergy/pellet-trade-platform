import { prisma } from "./prisma";

/**
 * Atomically reserve inventory.
 * Throws if insufficient stock.
 */
export async function reserveInventory(productId, quantityMT) {
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: { productId },
      lock: { mode: "ForUpdate" }
    });

    if (!inventory) {
      throw new Error("Inventory not initialized");
    }

    if (inventory.availableMT < quantityMT) {
      throw new Error("Insufficient inventory");
    }

    return tx.inventory.update({
      where: { productId },
      data: {
        availableMT: inventory.availableMT - quantityMT,
        reservedMT: inventory.reservedMT + quantityMT
      }
    });
  });
}

/**
 * Release inventory (on cancel / failure)
 */
export async function releaseInventory(productId, quantityMT) {
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: { productId }
    });

    if (!inventory) return;

    return tx.inventory.update({
      where: { productId },
      data: {
        availableMT: inventory.availableMT + quantityMT,
        reservedMT: Math.max(0, inventory.reservedMT - quantityMT)
      }
    });
  });
}

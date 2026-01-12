import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getInventoryBySite(siteId) {
  return prisma.inventory.findMany({
    where: { siteId },
    include: {
      product: true,
      site: true,
      updater: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateInventory(ctx, input) {
  if (!["OPS", "ADMIN"].includes(ctx.role)) {
    throw new Error("Unauthorized: inventory update");
  }

  const existing = await prisma.inventory.findFirst({
    where: {
      productId: input.productId,
      siteId: input.siteId,
    },
  });

  let inventory;

  if (existing) {
    inventory = await prisma.inventory.update({
      where: { id: existing.id },
      data: {
        availableMT: input.availableMT,
        updatedBy: ctx.userId,
      },
    });
  } else {
    inventory = await prisma.inventory.create({
      data: {
        productId: input.productId,
        siteId: input.siteId,
        availableMT: input.availableMT,
        updatedBy: ctx.userId,
      },
    });
  }

  await prisma.inventoryHistory.create({
    data: {
      productId: input.productId,
      siteId: input.siteId,
      quantity: input.availableMT,
      recordedBy: ctx.userId,
    },
  });

  return inventory;
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function createOrder(ctx, input) {
  if (!["BUYER", "OPS", "ADMIN"].includes(ctx.role)) {
    throw new Error("Unauthorized");
  }

  return prisma.order.create({
    data: {
      orgId: input.orgId,
      status: "CREATED",
      createdBy: ctx.userId,
    },
  });
}

export async function listOrders(ctx) {
  const where =
    ctx.role === "BUYER"
      ? { orgId: ctx.orgId }
      : {};

  return prisma.order.findMany({
    where,
    include: {
      org: true,
      batches: {
        include: {
          product: true,
          site: true,
          invoice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBatch(ctx, input) {
  if (!["OPS", "ADMIN"].includes(ctx.role)) {
    throw new Error("Unauthorized");
  }

  const inventory = await prisma.inventory.findFirst({
    where: {
      productId: input.productId,
      siteId: input.siteId,
    },
  });

  if (!inventory || inventory.availableMT < input.quantityMT) {
    throw new Error("Insufficient inventory");
  }

  await prisma.inventory.update({
    where: { id: inventory.id },
    data: {
      availableMT: inventory.availableMT - input.quantityMT,
      updatedBy: ctx.userId,
    },
  });

  return prisma.orderBatch.create({
    data: {
      orderId: input.orderId,
      productId: input.productId,
      siteId: input.siteId,
      quantityMT: input.quantityMT,
      createdBy: ctx.userId,
      status: "CREATED",
    },
  });
}

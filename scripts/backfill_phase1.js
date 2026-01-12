import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Phase-1 backfill...");

  // 1️⃣ Find a system user to attribute actions to
  // Prefer ADMIN, fallback to any user
  const systemUser =
    (await prisma.user.findFirst({ where: { role: "ADMIN" } })) ||
    (await prisma.user.findFirst());

  if (!systemUser) {
    throw new Error("No users found. Cannot backfill createdBy / updatedBy.");
  }

  console.log(`Using system user: ${systemUser.email}`);

  // 2️⃣ Create default Site
  let site = await prisma.site.findFirst();

  if (!site) {
    site = await prisma.site.create({
      data: {
        name: "Main Factory",
        city: "Unknown",
        state: "Unknown",
        active: true,
      },
    });
    console.log(`Created default site: ${site.name}`);
  } else {
    console.log(`Using existing site: ${site.name}`);
  }

  // 3️⃣ Backfill Inventory
  const inventories = await prisma.inventory.findMany();

  for (const inv of inventories) {
    await prisma.inventory.update({
      where: { id: inv.id },
      data: {
        siteId: site.id,
        updatedBy: systemUser.id,
        updatedAt: new Date(),
      },
    });

    await prisma.inventoryHistory.create({
      data: {
        productId: inv.productId,
        siteId: site.id,
        quantity: inv.availableMT,
        recordedBy: systemUser.id,
      },
    });
  }

  console.log(`Backfilled ${inventories.length} inventory rows`);

  // 4️⃣ Backfill Orders
  const orders = await prisma.order.findMany();

  for (const order of orders) {
    if (!order.createdBy) {
      await prisma.order.update({
        where: { id: order.id },
        data: { createdBy: systemUser.id },
      });
    }
  }

  console.log(`Backfilled ${orders.length} orders`);

  // 5️⃣ Backfill Order Batches
  const batches = await prisma.orderBatch.findMany();

  for (const batch of batches) {
    await prisma.orderBatch.update({
      where: { id: batch.id },
      data: {
        siteId: site.id,
        createdBy: systemUser.id,
      },
    });
  }

  console.log(`Backfilled ${batches.length} batches`);

  console.log("✅ Phase-1 backfill completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

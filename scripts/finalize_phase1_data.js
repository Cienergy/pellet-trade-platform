import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting final Phase-1 data normalization...");

  const now = new Date();

  // 1️⃣ Fix Product.updatedAt (only where NULL)
  const products = await prisma.product.findMany({
    where: { updatedAt: null },
  });

  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { updatedAt: now },
    });
  }

  console.log(`Fixed updatedAt for ${products.length} products`);

  // 2️⃣ Fix User.name (where NULL)
  const usersWithoutName = await prisma.user.findMany({
    where: { name: null },
  });

  for (const u of usersWithoutName) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        name: u.email.split("@")[0],
      },
    });
  }

  console.log(`Fixed name for ${usersWithoutName.length} users`);

  // 3️⃣ Normalize User.role values for enum cast
  const roleMap = {
    buyer: "BUYER",
    ops: "OPS",
    finance: "FINANCE",
    admin: "ADMIN",
  };

  const users = await prisma.user.findMany();

  for (const u of users) {
    const normalizedRole =
      roleMap[u.role?.toLowerCase()] || "BUYER";

    if (u.role !== normalizedRole) {
      await prisma.user.update({
        where: { id: u.id },
        data: { role: normalizedRole },
      });
    }
  }

  console.log("Normalized user roles");

  console.log("✅ Final Phase-1 data normalization complete");
}

main()
  .catch((e) => {
    console.error("❌ Final backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

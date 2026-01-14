/* prisma/seed.js */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function getOrCreateOrganization(name, state) {
  const existing = await prisma.organization.findFirst({
    where: { name },
  });

  if (existing) return existing;

  return prisma.organization.create({
    data: { name, state },
  });
}

async function getOrCreateUser({ email, name, role, passwordHash, orgId }) {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      orgId,
    },
  });
}

async function getOrCreateSite(name, city, state) {
  const existing = await prisma.site.findFirst({
    where: { name },
  });

  if (existing) return existing;

  return prisma.site.create({
    data: { name, city, state, active: true },
  });
}

async function getOrCreateProduct(data) {
  const existing = await prisma.product.findUnique({
    where: { sku: data.sku },
  });

  if (existing) return existing;

  return prisma.product.create({ data });
}

async function main() {
  console.log("🌱 Seeding Phase-1 demo data…");

  const passwordHash = await bcrypt.hash("demo123", 10);

  // ORGS
  const cienergy = await getOrCreateOrganization(
    "Cienergy Internal",
    "Maharashtra"
  );

  const buyerOrg = await getOrCreateOrganization(
    "Demo Buyer Org",
    "Gujarat"
  );

  // USERS
  const admin = await getOrCreateUser({
    email: "admin@cienergy.in",
    name: "Admin User",
    role: "ADMIN",
    passwordHash,
    orgId: cienergy.id,
  });

  const ops = await getOrCreateUser({
    email: "ops@cienergy.in",
    name: "Ops User",
    role: "OPS",
    passwordHash,
    orgId: cienergy.id,
  });

  const finance = await getOrCreateUser({
    email: "finance@cienergy.in",
    name: "Finance User",
    role: "FINANCE",
    passwordHash,
    orgId: cienergy.id,
  });

  const buyer = await getOrCreateUser({
    email: "buyer@cienergy.in",
    name: "Buyer User",
    role: "BUYER",
    passwordHash,
    orgId: buyerOrg.id,
  });

  // SITES
  const siteA = await getOrCreateSite(
    "Nagpur Plant",
    "Nagpur",
    "Maharashtra"
  );

  const siteB = await getOrCreateSite(
    "Raipur Plant",
    "Raipur",
    "Chhattisgarh"
  );

  // PRODUCTS
  const gradeA = await getOrCreateProduct({
    sku: "PELLET-A",
    name: "Biomass Pellets – Grade A",
    type: "PELLET",
    grade: "A",
    cvMin: 3800,
    cvMax: 4200,
    ashPct: 4.5,
    moisture: 8,
    pricePMT: 8200,
    active: true,
  });

  const gradeB = await getOrCreateProduct({
    sku: "PELLET-B",
    name: "Biomass Pellets – Grade B",
    type: "PELLET",
    grade: "B",
    cvMin: 3400,
    cvMax: 3700,
    ashPct: 6.5,
    moisture: 10,
    pricePMT: 7600,
    active: true,
  });

  // INVENTORY (idempotent)
  async function upsertInventory(productId, siteId, availableMT) {
    return prisma.inventory.upsert({
      where: {
        productId_siteId: { productId, siteId },
      },
      update: {
        availableMT,
        updatedBy: ops.id,
      },
      create: {
        productId,
        siteId,
        availableMT,
        updatedBy: ops.id,
      },
    });
  }

  await upsertInventory(gradeA.id, siteA.id, 120);
  await upsertInventory(gradeA.id, siteB.id, 60);
  await upsertInventory(gradeB.id, siteA.id, 60);
  await upsertInventory(gradeB.id, siteB.id, 0);

  // ORDER (BUYER DEMO)
  const existingOrder = await prisma.order.findFirst({
    where: { orgId: buyerOrg.id },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        orgId: buyerOrg.id,
        status: "IN_PROGRESS",
        createdBy: buyer.id,
      },
    });

    const batch = await prisma.orderBatch.create({
      data: {
        orderId: order.id,
        productId: gradeA.id,
        siteId: siteA.id,
        quantityMT: 50,
        status: "INVOICED",
        createdBy: ops.id,
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        batchId: batch.id,
        number: "INV-DEMO-001",
        subtotal: 410000,
        gstType: "CGST_SGST",
        gstRate: 18,
        gstAmount: 73800,
        totalAmount: 483800,
        status: "PENDING",
        erpStatus: "POSTED",
      },
    });

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: 100000,
        mode: "BANK_TRANSFER",
        verified: false,
      },
    });
  }

  console.log("✅ Phase-1 demo data seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

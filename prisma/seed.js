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

  const buyerOrg2 = await getOrCreateOrganization(
    "Acme Pellets Ltd",
    "Karnataka"
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

  const buyer2 = await getOrCreateUser({
    email: "buyer2@acme.in",
    name: "Acme Buyer",
    role: "BUYER",
    passwordHash,
    orgId: buyerOrg2.id,
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

  // Update orgs with margin/terms for dashboard
  await prisma.organization.updateMany({
    where: { id: buyerOrg.id },
    data: { defaultPaymentTerm: "NET_30", buyerMargin: 50000 },
  });
  await prisma.organization.updateMany({
    where: { id: buyerOrg2.id },
    data: { defaultPaymentTerm: "NET_60", buyerMargin: 75000 },
  });

  // Helper to create order + batch + invoice + optional payment (idempotent by order count)
  const orderCount = await prisma.order.count();
  if (orderCount < 5) {
    const ordersToCreate = 5 - orderCount;
    const orgs = [buyerOrg, buyerOrg2];
    const products = [gradeA, gradeB];
    const sites = [siteA, siteB];
    const statuses = ["ACCEPTED", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED", "COMPLETED"];
    const batchStatuses = ["INVOICED", "INVOICED", "IN_PROGRESS", "COMPLETED", "COMPLETED"];

    for (let i = 0; i < ordersToCreate; i++) {
      const org = orgs[i % orgs.length];
      const product = products[i % products.length];
      const site = sites[i % sites.length];
      const creator = org.id === buyerOrg.id ? buyer : buyer2;
      const order = await prisma.order.create({
        data: {
          orgId: org.id,
          status: statuses[i],
          requestedQuantityMT: 100 + i * 25,
          deliveryLocation: `Warehouse ${i + 1}`,
          createdBy: creator.id,
        },
      });

      const qty = 30 + i * 10;
      const subtotal = qty * product.pricePMT;
      const gstAmt = Math.round(subtotal * 0.18);
      const total = subtotal + gstAmt;
      const batch = await prisma.orderBatch.create({
        data: {
          orderId: order.id,
          productId: product.id,
          siteId: site.id,
          quantityMT: qty,
          status: batchStatuses[i],
          deliveryAt: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
          leftFromSiteAt: i >= 2 ? new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000) : null,
          dispatchedAt: i >= 3 ? new Date(Date.now() - (i - 2) * 24 * 60 * 60 * 1000) : null,
          createdBy: ops.id,
        },
      });

      const invNum = `INV-DEMO-${String(1000 + orderCount + i).padStart(4, "0")}`;
      const paymentTerm = i % 3 === 0 ? "NET_30" : i % 3 === 1 ? "NET_60" : "NET_90";
      const invoice = await prisma.invoice.create({
        data: {
          batchId: batch.id,
          number: invNum,
          subtotal,
          gstType: "CGST_SGST",
          gstRate: 18,
          gstAmount: gstAmt,
          cgst: gstAmt / 2,
          sgst: gstAmt / 2,
          totalAmount: total,
          paymentTerm,
          status: "CREATED",
          erpStatus: "PENDING",
          invoiceType: "STANDARD",
        },
      });
      // Add payment(s) for first two invoices so dashboard shows pending + verified
      if (i === 0) {
        await prisma.payment.create({
          data: { invoiceId: invoice.id, amount: total * 0.5, mode: "NEFT", verified: true },
        });
        await prisma.payment.create({
          data: { invoiceId: invoice.id, amount: total * 0.3, mode: "NEFT", verified: false },
        });
      } else if (i === 1) {
        await prisma.payment.create({
          data: { invoiceId: invoice.id, amount: total, mode: "NEFT", verified: true },
        });
      }
    }
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

import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [pendingOrders, batches, inventoryUpdates, freightSum7d, freightMissing7d] = await Promise.all([
    prisma.order.count({
      where: { status: "CREATED" },
    }),
    prisma.orderBatch.count({
      where: { status: "CREATED" },
    }),
    prisma.inventoryHistory.count({
      where: {
        recordedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
    prisma.orderBatch.aggregate({
      where: { dispatchedAt: { gte: sevenDaysAgo }, freightCost: { not: null } },
      _sum: { freightCost: true },
    }),
    prisma.orderBatch.count({
      where: { dispatchedAt: { gte: sevenDaysAgo }, freightCost: null },
    }),
  ]);

  const inProgressOrders = await prisma.order.count({
    where: { status: "IN_PROGRESS" },
  });

  return res.status(200).json({
    pendingOrders,
    inProgressOrders,
    pendingBatches: batches,
    inventoryUpdates,
    freight: {
      sum7d: freightSum7d?._sum?.freightCost || 0,
      missingCount7d: freightMissing7d || 0,
    },
  });
}

export default requireAuth(requireRole("OPS", handler));


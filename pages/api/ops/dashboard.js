import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const [pendingOrders, batches, inventoryUpdates] = await Promise.all([
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
  ]);

  const inProgressOrders = await prisma.order.count({
    where: { status: "IN_PROGRESS" },
  });

  return res.status(200).json({
    pendingOrders,
    inProgressOrders,
    pendingBatches: batches,
    inventoryUpdates,
  });
}

export default requireAuth(requireRole("OPS", handler));


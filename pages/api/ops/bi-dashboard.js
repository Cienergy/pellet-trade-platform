import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Batch Status Distribution
    const batchStatuses = await prisma.orderBatch.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // Site Utilization
    const siteUtilization = await prisma.orderBatch.groupBy({
      by: ["siteId"],
      _count: { id: true },
      _sum: { quantityMT: true },
    });

    const siteDetails = await Promise.all(
      siteUtilization.map(async (site) => {
        const s = await prisma.site.findUnique({
          where: { id: site.siteId },
        });
        return {
          siteName: s?.name || "Unknown",
          batchCount: site._count.id,
          totalMT: site._sum.quantityMT || 0,
        };
      })
    );

    // Average Processing Time (batches that are completed)
    const completedBatches = await prisma.orderBatch.findMany({
      where: { status: "COMPLETED" },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    const avgProcessingTime =
      completedBatches.length > 0
        ? completedBatches.reduce((sum, batch) => {
            const processingTime =
              new Date(batch.updatedAt) - new Date(batch.createdAt);
            return sum + processingTime;
          }, 0) / completedBatches.length
        : 0;

    // Orders by Status
    const orderStatuses = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return res.status(200).json({
      batchStatuses: batchStatuses.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      siteUtilization: siteDetails,
      avgProcessingTimeDays: Math.round(avgProcessingTime / (1000 * 60 * 60 * 24)),
      orderStatuses: orderStatuses.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    });
  } catch (err) {
    console.error("Ops BI Dashboard Error:", err);
    return res.status(500).json({ error: "Failed to load BI data" });
  }
}

export default requireAuth(requireRole("OPS", handler));


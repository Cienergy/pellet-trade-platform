import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Buyer Activity - Top buyers by order volume
    const topBuyers = await prisma.order.groupBy({
      by: ["orgId"],
      _count: { id: true },
      _sum: { quantityMT: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const buyerDetails = await Promise.all(
      topBuyers.map(async (buyer) => {
        const org = await prisma.organization.findUnique({
          where: { id: buyer.orgId },
        });
        return {
          orgName: org?.name || "Unknown",
          orderCount: buyer._count.id,
          totalMT: buyer._sum.quantityMT || 0,
        };
      })
    );

    // Market Trends - Products by order volume
    const productTrends = await prisma.orderBatch.groupBy({
      by: ["productId"],
      _count: { id: true },
      _sum: { quantityMT: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const productDetails = await Promise.all(
      productTrends.map(async (product) => {
        const prod = await prisma.product.findUnique({
          where: { id: product.productId },
        });
        return {
          productName: prod?.name || "Unknown",
          batchCount: product._count.id,
          totalMT: product._sum.quantityMT || 0,
        };
      })
    );

    // Order Status Distribution
    const orderStatuses = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // Revenue Trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentInvoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const dailyRevenue = {};
    recentInvoices.forEach((inv) => {
      const date = inv.createdAt.toISOString().split("T")[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + inv.totalAmount;
    });

    // Site Performance
    const sitePerformance = await prisma.orderBatch.groupBy({
      by: ["siteId"],
      _count: { id: true },
      _sum: { quantityMT: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const siteDetails = await Promise.all(
      sitePerformance.map(async (site) => {
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

    return res.status(200).json({
      topBuyers: buyerDetails,
      productTrends: productDetails,
      orderStatuses: orderStatuses.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({
        date,
        amount,
      })),
      sitePerformance: siteDetails,
    });
  } catch (err) {
    console.error("BI Dashboard Error:", err);
    return res.status(500).json({ error: "Failed to load BI data" });
  }
}

export default requireAuth(requireRole("ADMIN", handler));


import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const session = req.session;

  try {
    // My Order History
    const myOrders = await prisma.order.findMany({
      where: { orgId: session.orgId },
      include: {
        batches: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Order Status Summary
    const orderStatusSummary = await prisma.order.groupBy({
      by: ["status"],
      where: { orgId: session.orgId },
      _count: { id: true },
    });

    // Total Spent
    const invoices = await prisma.invoice.findMany({
      where: {
        batch: {
          order: {
            orgId: session.orgId,
          },
        },
      },
      select: {
        totalAmount: true,
      },
    });

    const totalSpent = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Favorite Products (most ordered)
    const productOrders = await prisma.orderBatch.groupBy({
      by: ["productId"],
      where: {
        order: {
          orgId: session.orgId,
        },
      },
      _count: { id: true },
      _sum: { quantityMT: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const favoriteProducts = await Promise.all(
      productOrders.map(async (p) => {
        const product = await prisma.product.findUnique({
          where: { id: p.productId },
        });
        return {
          productName: product?.name || "Unknown",
          orderCount: p._count.id,
          totalMT: p._sum.quantityMT || 0,
        };
      })
    );

    return res.status(200).json({
      recentOrders: myOrders.map((order) => ({
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        totalMT: order.batches.reduce((sum, b) => sum + b.quantityMT, 0),
      })),
      orderStatusSummary: orderStatusSummary.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      totalSpent,
      favoriteProducts,
    });
  } catch (err) {
    console.error("Buyer BI Dashboard Error:", err);
    return res.status(500).json({ error: "Failed to load BI data" });
  }
}

export default requireAuth(requireRole("BUYER", handler));


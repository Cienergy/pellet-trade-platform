import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Payment Trends
    const paymentTrends = await prisma.payment.groupBy({
      by: ["mode"],
      _count: { id: true },
      _sum: { amount: true },
    });

    // Revenue by Month
    const invoices = await prisma.invoice.findMany({
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const monthlyRevenue = {};
    invoices.forEach((inv) => {
      const month = inv.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + inv.totalAmount;
    });

    // Pending vs Verified Payments
    const paymentStats = await prisma.payment.groupBy({
      by: ["verified"],
      _count: { id: true },
      _sum: { amount: true },
    });

    // Invoice Status Distribution
    const invoiceStatuses = await prisma.invoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    return res.status(200).json({
      paymentTrends: paymentTrends.map((p) => ({
        mode: p.mode,
        count: p._count.id,
        totalAmount: p._sum.amount || 0,
      })),
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, amount]) => ({
        month,
        amount,
      })),
      paymentStats: paymentStats.map((p) => ({
        verified: p.verified,
        count: p._count.id,
        totalAmount: p._sum.amount || 0,
      })),
      invoiceStatuses: invoiceStatuses.map((s) => ({
        status: s.status,
        count: s._count.id,
        totalAmount: s._sum.totalAmount || 0,
      })),
    });
  } catch (err) {
    console.error("Finance BI Dashboard Error:", err);
    return res.status(500).json({ error: "Failed to load BI data" });
  }
}

export default requireAuth(requireRole("FINANCE", handler));


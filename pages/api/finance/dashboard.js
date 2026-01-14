import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const [pendingPayments, invoices, totalRevenue, verifiedPayments] =
    await Promise.all([
      prisma.payment.count({ where: { verified: false } }),
      prisma.invoice.count(),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.payment.count({ where: { verified: true } }),
    ]);

  const pendingAmount = await prisma.payment.aggregate({
    where: { verified: false },
    _sum: { amount: true },
  });

  return res.status(200).json({
    pendingPayments,
    pendingAmount: pendingAmount._sum.amount || 0,
    invoices,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    verifiedPayments,
  });
}

export default requireAuth(requireRole("FINANCE", handler));


import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      batch: { order: { status: { not: "REJECTED" } } },
    },
    include: {
      batch: {
        include: {
          order: { include: { org: true } },
          product: true,
        },
      },
    },
  });

  const byProduct = {};
  const byBuyer = {};
  let totalRevenue = 0;
  const monthly = {};

  for (const inv of invoices) {
    totalRevenue += inv.totalAmount;
    const productName = inv.batch?.product?.name || "Unknown";
    const buyerName = inv.batch?.order?.org?.name || "Unknown";
    const month = inv.createdAt.toISOString().slice(0, 7);

    byProduct[productName] = (byProduct[productName] || { count: 0, amount: 0 });
    byProduct[productName].count += 1;
    byProduct[productName].amount += inv.totalAmount;

    byBuyer[buyerName] = (byBuyer[buyerName] || { count: 0, amount: 0 });
    byBuyer[buyerName].count += 1;
    byBuyer[buyerName].amount += inv.totalAmount;

    monthly[month] = (monthly[month] || { count: 0, amount: 0 });
    monthly[month].count += 1;
    monthly[month].amount += inv.totalAmount;
  }

  return res.status(200).json({
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    totalInvoices: invoices.length,
    totalRevenue,
    byProduct: Object.entries(byProduct).map(([name, d]) => ({ name, ...d })),
    byBuyer: Object.entries(byBuyer).map(([name, d]) => ({ name, ...d })),
    monthly: Object.entries(monthly)
      .map(([month, d]) => ({ month, ...d }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  });
}

export default requireAuth(requireRole(["FINANCE", "ADMIN"], handler));

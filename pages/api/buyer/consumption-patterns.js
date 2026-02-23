import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";

async function handler(req, res) {
  const session = req.session;

  if (session.role !== "BUYER") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  // Get buyer's order history
  const orders = await prisma.order.findMany({
    where: {
      orgId: session.orgId,
      status: {
        in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"],
      },
    },
    include: {
      batches: {
        include: {
          product: true,
          invoice: true,
        },
      },
      requestedProduct: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Analyze consumption patterns
  const patterns = {
    totalOrders: orders.length,
    totalQuantityMT: 0,
    productBreakdown: {},
    monthlyTrend: {},
    averageOrderSize: 0,
    mostOrderedProduct: null,
    orderFrequency: {},
  };

  const productStats = {};
  const monthlyData = {};

  orders.forEach((order) => {
    const orderDate = new Date(order.createdAt);
    const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { orders: 0, quantity: 0 };
    }
    monthlyData[monthKey].orders += 1;

    const orderQty = order.batches.reduce((sum, b) => sum + b.quantityMT, 0);
    patterns.totalQuantityMT += orderQty;
    monthlyData[monthKey].quantity += orderQty;

    order.batches.forEach((batch) => {
      const productName = batch.product.name;
      if (!productStats[productName]) {
        productStats[productName] = {
          name: productName,
          totalQuantity: 0,
          orderCount: 0,
          averagePrice: 0,
          totalValue: 0,
        };
      }
      productStats[productName].totalQuantity += batch.quantityMT;
      productStats[productName].orderCount += 1;
      if (batch.invoice) {
        productStats[productName].totalValue += batch.invoice.totalAmount;
      }
    });
  });

  // Calculate averages
  Object.keys(productStats).forEach((productName) => {
    const stats = productStats[productName];
    stats.averagePrice = stats.totalValue / stats.totalQuantity || 0;
    patterns.productBreakdown[productName] = stats;
  });

  // Find most ordered product
  let maxQty = 0;
  Object.keys(productStats).forEach((productName) => {
    if (productStats[productName].totalQuantity > maxQty) {
      maxQty = productStats[productName].totalQuantity;
      patterns.mostOrderedProduct = productName;
    }
  });

  patterns.averageOrderSize = orders.length > 0 ? patterns.totalQuantityMT / orders.length : 0;
  patterns.monthlyTrend = monthlyData;

  // Calculate order frequency (orders per month)
  const months = Object.keys(monthlyData).sort();
  if (months.length > 0) {
    const firstMonth = new Date(months[0] + "-01");
    const lastMonth = new Date(months[months.length - 1] + "-01");
    const monthDiff = (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 + 
                      (lastMonth.getMonth() - firstMonth.getMonth()) + 1;
    patterns.orderFrequency = {
      ordersPerMonth: monthDiff > 0 ? orders.length / monthDiff : orders.length,
      totalMonths: monthDiff || 1,
    };
  }

  return res.status(200).json(patterns);
}

export default requireAuth(handler);


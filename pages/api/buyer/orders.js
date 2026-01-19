import { prisma } from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";

async function handler(req, res) {
  const session = req.session;

  if (session.role !== "BUYER") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const orders = await prisma.order.findMany({
    where: {
      orgId: session.orgId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      batches: {
        include: {
          product: true,
          invoice: {
            include: {
              payments: true,
            },
          },
          site: true,
        },
      },
    },
  });

  /**
   * Normalize DB → UI shape
   */
  const response = orders.map((order) => {
    const batchedMT = order.batches.reduce((sum, b) => sum + b.quantityMT, 0);
    const requestedMT = order.requestedQuantityMT || batchedMT; // Fallback if not set
    const remainingMT = Math.max(0, requestedMT - batchedMT);

    const batches = order.batches.map((b) => ({
      id: b.id,
      product: {
        name: b.product.name,
        pricePMT: b.product.pricePMT,
      },
      site: b.site?.name || "—",
      quantityMT: b.quantityMT,
      deliveryAt: b.deliveryAt,
      status: b.status,

      invoice: b.invoice
        ? {
            id: b.invoice.id,
            number: b.invoice.number,
            subtotal: b.invoice.subtotal,
            gstRate: b.invoice.gstRate,
            gstAmount: b.invoice.gstAmount,
            total: b.invoice.totalAmount,
            status: b.invoice.status,
            payments: b.invoice.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              verified: p.verified,
            })),
          }
        : null,
    }));

    // Calculate amounts
    const totalMT = batches.reduce((sum, b) => sum + b.quantityMT, 0);
    const totalAmount = batches.reduce((sum, b) => sum + (b.invoice?.total || 0), 0);
    const paidAmount = batches.reduce((sum, b) => {
      if (!b.invoice?.payments) return sum;
      return sum + b.invoice.payments
        .filter(p => p.verified)
        .reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);
    const pendingAmount = totalAmount - paidAmount;

    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      requestedQuantityMT: requestedMT,
      batchedMT,
      remainingMT,
      totalMT: batchedMT, // Keep for backward compatibility
      totalAmount,
      paidAmount,
      pendingAmount,
      batches,
    };
  });

  return res.status(200).json(response);
}

export default requireAuth(handler);

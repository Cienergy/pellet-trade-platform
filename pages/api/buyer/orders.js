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
  const response = orders.map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    totalMT: order.batches.reduce(
      (sum, b) => sum + b.quantityMT,
      0
    ),

    batches: order.batches.map((b) => ({
      id: b.id,
      product: {
        name: b.product.name,
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
    })),
  }));

  return res.status(200).json(response);
}

export default requireAuth(handler);

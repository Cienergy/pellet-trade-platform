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
      requestedProduct: true, // Include requested product to calculate full PO amount
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
            totalAmount: b.invoice.totalAmount,
            total: b.invoice.totalAmount, // Keep for backward compatibility
            status: b.invoice.status,
            paymentTerm: b.invoice.paymentTerm || "NET_30",
            createdAt: b.invoice.createdAt,
            payments: b.invoice.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              mode: p.mode,
              verified: p.verified,
              proofUrl: p.proofUrl,
            })),
          }
        : null,
    }));

    // Calculate amounts
    const totalMT = batches.reduce((sum, b) => sum + b.quantityMT, 0);
    const invoicedAmount = batches.reduce((sum, b) => sum + (b.invoice?.total || 0), 0); // Amount raised/invoiced
    const paidAmount = batches.reduce((sum, b) => {
      if (!b.invoice?.payments) return sum;
      return sum + b.invoice.payments
        .filter(p => p.verified)
        .reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);
    
    // Calculate full PO amount (requested quantity * price * 1.05 for GST)
    const fullPOAmount = order.requestedProduct && requestedMT > 0
      ? requestedMT * order.requestedProduct.pricePMT * 1.05
      : invoicedAmount; // Fallback to invoiced amount if no requested product
    
    // For rejected orders, pending amount should be 0
    const pendingAmount = order.status === "REJECTED" ? 0 : (invoicedAmount - paidAmount);

    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      rejectionReason: order.rejectionReason,
      deliveryLocation: order.deliveryLocation,
      notes: order.notes,
      requestedQuantityMT: requestedMT,
      requestedProduct: order.requestedProduct ? {
        id: order.requestedProduct.id,
        name: order.requestedProduct.name,
        type: order.requestedProduct.type,
        pricePMT: order.requestedProduct.pricePMT,
      } : null,
      batchedMT,
      remainingMT,
      totalMT: batchedMT, // Keep for backward compatibility
      fullPOAmount, // Full PO amount to be paid
      invoicedAmount, // Amount raised/invoiced so far
      totalAmount: invoicedAmount, // Keep for backward compatibility
      paidAmount,
      pendingAmount,
      batches,
    };
  });

  // Disable caching to ensure fresh data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  return res.status(200).json(response);
}

export default requireAuth(handler);

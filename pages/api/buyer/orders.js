import { prisma } from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  const session = req.session;

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
          invoices: { include: { payments: true } },
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

    const batches = order.batches.map((b) => {
      const invs = b.invoices || [];
      const primary = invs[0] || null;
      return {
        id: b.id,
        product: { name: b.product.name, pricePMT: b.product.pricePMT },
        site: b.site?.name || "—",
        quantityMT: b.quantityMT,
        deliveryAt: b.deliveryAt,
        status: b.status,
        invoices: invs.map((inv) => ({
          id: inv.id,
          number: inv.number,
          invoiceType: inv.invoiceType,
          subtotal: inv.subtotal,
          gstRate: inv.gstRate,
          gstAmount: inv.gstAmount,
          totalAmount: inv.totalAmount,
          total: inv.totalAmount,
          status: inv.status,
          paymentTerm: inv.paymentTerm || "NET_30",
          createdAt: inv.createdAt,
          payments: (inv.payments || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            mode: p.mode,
            verified: p.verified,
            proofUrl: p.proofUrl,
          })),
        })),
        invoice: primary
          ? {
              id: primary.id,
              number: primary.number,
              subtotal: primary.subtotal,
              gstRate: primary.gstRate,
              gstAmount: primary.gstAmount,
              totalAmount: primary.totalAmount,
              total: primary.totalAmount,
              status: primary.status,
              paymentTerm: primary.paymentTerm || "NET_30",
              createdAt: primary.createdAt,
              payments: (primary.payments || []).map((p) => ({
                id: p.id,
                amount: p.amount,
                mode: p.mode,
                verified: p.verified,
                proofUrl: p.proofUrl,
              })),
            }
          : null,
      };
    });

    const totalMT = batches.reduce((sum, b) => sum + b.quantityMT, 0);
    const invoicedAmount = batches.reduce((sum, b) => sum + (b.invoices || []).reduce((s, inv) => s + (inv.totalAmount || 0), 0), 0);
    const paidAmount = batches.reduce((sum, b) => {
      return sum + (b.invoices || []).reduce((invSum, inv) => {
        return invSum + (inv.payments || []).filter((p) => p.verified).reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);
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

export default requireAuth(requireRole("BUYER", handler));

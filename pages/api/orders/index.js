import requireAuth from "../../../lib/requireAuth";
import prisma from "../../../lib/prisma";
import { logAudit } from "../../../lib/audit";

async function handler(req, res) {
  const session = req.session;

  if (req.method === "POST") {
    if (session.role !== "BUYER") {
      return res.status(403).json({ error: "Only buyers can create orders" });
    }

    const { productId, siteId, quantityMT } = req.body;

    if (!productId || !siteId || !quantityMT) {
      return res.status(400).json({
        error: "productId, siteId, and quantityMT are required",
      });
    }

    // Create order with requested quantity
    const requestedQty = Number(quantityMT);
    const order = await prisma.order.create({
      data: {
        orgId: session.orgId,
        createdBy: session.userId,
        status: "CREATED",
        requestedQuantityMT: requestedQty, // Store original requested quantity
        batches: {
          create: {
            productId,
            siteId,
            quantityMT: requestedQty,
            status: "CREATED",
            createdBy: session.userId,
          },
        },
      },
      include: {
        batches: {
          include: {
            product: true,
            site: true,
          },
        },
      },
    });

    await logAudit({
      actorId: session.userId,
      entity: "order",
      entityId: order.id,
      action: "created",
    });

    return res.status(201).json(order);
  }

  if (req.method === "GET") {
    const where =
      session.role === "BUYER"
        ? { orgId: session.orgId }
        : session.role === "OPS"
        ? {}
        : {};

    const orders = await prisma.order.findMany({
      where,
      include: {
        batches: {
          include: {
            product: true,
            site: true,
            invoice: {
              include: { payments: true },
            },
          },
        },
        org: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich with amount calculations and remaining quantity
    const enrichedOrders = orders.map((order) => {
      const batchedMT = order.batches.reduce((sum, b) => sum + b.quantityMT, 0);
      const requestedMT = order.requestedQuantityMT || batchedMT; // Fallback to batched if not set
      const remainingMT = Math.max(0, requestedMT - batchedMT);
      
      const totalAmount = order.batches.reduce((sum, b) => sum + (b.invoice?.totalAmount || 0), 0);
      const paidAmount = order.batches.reduce((sum, b) => {
        if (!b.invoice?.payments) return sum;
        return sum + b.invoice.payments
          .filter(p => p.verified)
          .reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);
      const pendingAmount = totalAmount - paidAmount;

      return {
        ...order,
        requestedQuantityMT: requestedMT,
        batchedMT,
        remainingMT,
        totalMT: batchedMT, // Keep for backward compatibility
        totalAmount,
        paidAmount,
        pendingAmount,
      };
    });

    return res.status(200).json(enrichedOrders);
  }

  return res.status(405).end();
}

export default requireAuth(handler);

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

    // Create order
    const order = await prisma.order.create({
      data: {
        orgId: session.orgId,
        createdBy: session.userId,
        status: "CREATED",
        batches: {
          create: {
            productId,
            siteId,
            quantityMT: Number(quantityMT),
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

    return res.status(200).json(orders);
  }

  return res.status(405).end();
}

export default requireAuth(handler);

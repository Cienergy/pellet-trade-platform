import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = req.session;
  const { orderId } = req.query;
  const { productId, siteId, quantityMT } = req.body;

  if (!productId || !siteId || !quantityMT) {
    return res.status(400).json({
      error: "productId, siteId, and quantityMT are required",
    });
  }

  const batch = await prisma.orderBatch.create({
    data: {
      orderId,
      productId,
      siteId,
      quantityMT: Number(quantityMT),
      status: "CREATED",
      createdBy: session.userId,
    },
    include: {
      product: true,
      site: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "orderBatch",
      entityId: batch.id,
      action: "created",
      actorId: session.userId,
    },
  });

  return res.status(201).json(batch);
}

export default requireAuth(
  requireRole("OPS", handler)
);

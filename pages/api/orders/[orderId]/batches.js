import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { requireRole } from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { orderId } = req.query;
  const { productId, quantityMT } = req.body;

  const batch = await prisma.orderBatch.create({
    data: { orderId, productId, quantityMT },
  });

  return res.status(201).json(batch);
}

export default requireAuth(
  requireRole(["ops"], handler)
);

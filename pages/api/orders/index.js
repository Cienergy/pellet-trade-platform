import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { requireRole } from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method === "GET") {
    const orders = await prisma.order.findMany({
      where: { orgId: req.session.orgId },
      include: { batches: { include: { product: true, invoice: true } } },
    });
    return res.status(200).json(orders);
  }

  return res.status(405).end();
}

export default requireAuth(
  requireRole(["buyer", "finance", "ops", "admin"], handler)
);

import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  const session = req.session;

  if (req.method === "GET") {
    const { orgId, productId, active } = req.query;

    const where = {};
    if (orgId) where.orgId = orgId;
    if (productId) where.productId = productId;
    if (active !== undefined) where.active = active === "true";

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        org: true,
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(contracts);
  }

  if (req.method === "POST") {
    if (!["ADMIN", "FINANCE"].includes(session.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { orgId, productId, name, pricePMT, startDate, endDate, notes } = req.body;

    if (!orgId || !name || !startDate) {
      return res.status(400).json({
        error: "orgId, name, and startDate are required",
      });
    }

    const contract = await prisma.contract.create({
      data: {
        orgId,
        productId: productId || null,
        name,
        pricePMT: pricePMT ? Number(pricePMT) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
        active: true,
      },
      include: {
        org: true,
        product: true,
      },
    });

    return res.status(201).json(contract);
  }

  return res.status(405).end();
}

export default requireAuth(requireRole(["ADMIN", "FINANCE"], handler));


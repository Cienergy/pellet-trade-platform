import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const [users, products, sites, inventory, orders] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true } }),
    prisma.site.count({ where: { active: true } }),
    prisma.inventory.aggregate({
      _sum: { availableMT: true },
    }),
    prisma.order.count(),
  ]);

  return res.status(200).json({
    users,
    products,
    sites,
    totalInventoryMT: inventory._sum.availableMT || 0,
    orders,
  });
}

export default requireAuth(requireRole("ADMIN", handler));


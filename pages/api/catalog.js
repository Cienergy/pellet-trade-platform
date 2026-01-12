import requireAuth from "../../lib/requireAuth";
import { prisma } from "../../lib/prisma";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.session.role !== "BUYER")
    return res.status(403).json({ error: "Forbidden" });

  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      inventory: {
        include: { site: true },
      },
    },
    orderBy: { name: "asc" },
  });

  res.status(200).json(products);
}

export default requireAuth(handler);

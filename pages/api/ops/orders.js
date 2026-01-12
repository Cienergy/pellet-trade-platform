import { prisma } from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";

async function handler(req, res) {
  const orders = await prisma.order.findMany({
    include: {
      batches: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ orders });
}

export default requireAuth(handler, ["ops", "finance"]);

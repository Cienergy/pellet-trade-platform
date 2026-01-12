import { prisma } from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";

console.log('requireAuth =', requireAuth)

async function handler(req, res) {
  const { role, orgId } = req.session;

  if (req.method === "GET") {
    const where =
      role === "admin" || role === "finance" || role === "ops"
        ? {}
        : { orgId };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        batches: {
          include: {
            product: true,
            invoice: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(orders);
  }

  if (req.method === "POST") {
    if (role !== "buyer") {
      return res.status(403).json({ error: "Only buyers can create orders" });
    }

    const { type } = req.body;
    if (!type) {
      return res.status(400).json({ error: "Order type required" });
    }

    const order = await prisma.order.create({
      data: {
        orgId,
        type,
        status: "created",
      },
    });

    return res.status(201).json(order);
  }

  return res.status(405).end();
}

export default requireAuth(handler);

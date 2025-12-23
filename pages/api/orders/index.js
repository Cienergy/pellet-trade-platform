const { prisma } = require("../../../lib/prisma");

export default async function handler(req, res) {
  if (req.method === "GET") {
    const orders = await prisma.order.findMany({
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
    const { orgId, type } = req.body;

    if (!orgId || !type) {
      return res.status(400).json({ error: "orgId and type required" });
    }

    const order = await prisma.order.create({
      data: { orgId, type, status: "created" },
    });

    return res.status(201).json(order);
  }

  return res.status(405).end();
}

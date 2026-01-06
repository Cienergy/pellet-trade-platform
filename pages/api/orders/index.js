import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { requireRole } from "../../../lib/requireRole";

async function handler(req, res) {
  const user = req.user;

  if (req.method === "GET") {
    const where =
      user.role === "buyer"
        ? { orgId: user.orgId }
        : {};

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
    // buyers are blocked by requireRole wrapper
    const { orgId, type } = req.body;

    if (!orgId || !type) {
      return res.status(400).json({ error: "orgId and type required" });
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

export default requireAuth(
  requireRole(["admin", "ops", "finance", "buyer"])(handler)
);

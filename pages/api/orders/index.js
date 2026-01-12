import { prisma } from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";

async function handler(req, res) {
  const { role, orgId, userId } = req.user;

  // ---------- GET ORDERS ----------
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

    // 🔒 ALWAYS return a stable shape
    return res.status(200).json({ orders });
  }

  // ---------- CREATE ORDER (BUYER ONLY) ----------
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
        buyerId: userId,
        type,
        status: "created",
      },
    });

    return res.status(201).json({ order });
  }

  return res.status(405).end();
}

export default requireAuth(handler);

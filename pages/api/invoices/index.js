import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { requireRole } from "../../../lib/requireRole";

async function handler(req, res) {
  const user = req.user;

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const where =
    user.role === "buyer"
      ? {
          batch: {
            order: {
              orgId: user.orgId,
            },
          },
        }
      : {};

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      batch: {
        include: {
          product: true,
          order: true,
        },
      },
      payments: true,
    },
  });

  return res.status(200).json(invoices);
}

export default requireAuth(
  requireRole(["admin", "finance", "buyer"])(handler)
);

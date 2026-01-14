import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  const session = req.session;

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const where =
    session.role === "BUYER"
      ? {
          batch: {
            order: {
              orgId: session.orgId,
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
  requireRole(["ADMIN", "FINANCE", "BUYER"], handler)
);

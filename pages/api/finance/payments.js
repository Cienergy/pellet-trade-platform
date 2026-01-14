import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const payments = await prisma.payment.findMany({
    where: { verified: false },
    include: {
      invoice: {
        include: {
          batch: {
            include: {
              product: true,
              order: {
                include: {
                  org: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(payments);
}

export default requireAuth(requireRole("FINANCE", handler));


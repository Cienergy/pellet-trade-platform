import requireAuth from "../../../lib/requireAuth";
import { prisma } from "../../../lib/prisma";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: req.query.id },
    include: {
      batch: {
        include: {
          product: true,
          site: true,
          order: true,
        },
      },
      payments: true,
    },
  });

  if (!invoice) {
    return res.status(404).end();
  }

  return res.status(200).json(invoice);
}

export default requireAuth(handler);

import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { requireRole } from "../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { batchId, gstRate } = req.body;

  // (existing GST logic unchanged)
  const invoice = await prisma.invoice.create({ /* ... */ });

  return res.status(201).json(invoice);
}

export default requireAuth(
  requireRole(["finance"], handler)
);

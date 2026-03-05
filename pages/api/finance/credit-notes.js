import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

/**
 * GET: List all credit notes with invoice and refunds.
 * POST: Create a credit note for an invoice.
 * Body: { invoiceId, amount, reason?, number? }
 */
async function handler(req, res) {
  if (req.method === "GET") {
    const list = await prisma.creditNote.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          include: {
            batch: { include: { order: { include: { org: true } } } },
          },
        },
        refunds: true,
      },
    });
    return res.status(200).json(list);
  }

  if (req.method !== "POST") return res.status(405).end();

  const session = req.session;
  const { invoiceId, amount, reason, number: cnNumber } = req.body || {};

  if (!invoiceId || amount == null || Number(amount) <= 0) {
    return res.status(400).json({ error: "invoiceId and positive amount are required" });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { batch: { include: { order: { include: { org: true } } } } },
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  const creditAmount = Number(amount);
  const cnNum = cnNumber && String(cnNumber).trim()
    ? String(cnNumber).trim()
    : `CN-${new Date().toISOString().slice(0, 7).replace(/-/, "")}-${String(Date.now()).slice(-6)}`;

  const creditNote = await prisma.creditNote.create({
    data: {
      invoiceId,
      number: cnNum,
      amount: creditAmount,
      reason: reason ? String(reason).slice(0, 500) : null,
      status: "ISSUED",
      createdBy: session.userId,
    },
    include: { invoice: true },
  });

  await logAudit({
    actorId: session.userId,
    entity: "creditNote",
    entityId: creditNote.id,
    action: "created",
    meta: { invoiceId, amount: creditAmount, number: creditNote.number },
  });

  return res.status(201).json(creditNote);
}

export default requireAuth(requireRole(["ADMIN", "FINANCE"], handler));

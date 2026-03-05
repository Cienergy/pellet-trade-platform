import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

/**
 * POST: Create a refund against a credit note.
 * Body: { creditNoteId, amount }
 */
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = req.session;
  const { creditNoteId, amount } = req.body || {};

  if (!creditNoteId || amount == null || Number(amount) <= 0) {
    return res.status(400).json({ error: "creditNoteId and positive amount are required" });
  }

  const creditNote = await prisma.creditNote.findUnique({
    where: { id: creditNoteId },
    include: { refunds: true },
  });

  if (!creditNote) {
    return res.status(404).json({ error: "Credit note not found" });
  }

  const refundAmount = Number(amount);
  const alreadyRefunded = creditNote.refunds
    .filter((r) => r.status === "PROCESSED")
    .reduce((s, r) => s + r.amount, 0);
  if (alreadyRefunded + refundAmount > creditNote.amount) {
    return res.status(400).json({
      error: `Refund amount exceeds credit note balance. Credit note: ₹${creditNote.amount}, already refunded: ₹${alreadyRefunded}`,
    });
  }

  const refund = await prisma.refund.create({
    data: {
      creditNoteId,
      amount: refundAmount,
      status: "PENDING",
      createdBy: session.userId,
    },
    include: { creditNote: { include: { invoice: true } } },
  });

  await logAudit({
    actorId: session.userId,
    entity: "refund",
    entityId: refund.id,
    action: "created",
    meta: { creditNoteId, amount: refundAmount },
  });

  return res.status(201).json(refund);
}

export default requireAuth(requireRole(["ADMIN", "FINANCE"], handler));

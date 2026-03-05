import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";
import { logAudit } from "../../../lib/audit";

/**
 * POST: Send dunning reminder for an overdue invoice (audit log only; no email).
 * Body: { invoiceId }
 */
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = req.session;
  const { invoiceId } = req.body || {};

  if (!invoiceId) {
    return res.status(400).json({ error: "invoiceId is required" });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      batch: { include: { order: { include: { org: true } } } },
    },
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  await logAudit({
    actorId: session.userId,
    entity: "invoice",
    entityId: invoice.id,
    action: "dunning_reminder_sent",
    meta: {
      invoiceNumber: invoice.number,
      buyerName: invoice.batch?.order?.org?.name,
    },
  });

  return res.status(200).json({
    ok: true,
    message: "Reminder logged. Invoice: " + invoice.number,
  });
}

export default requireAuth(requireRole(["ADMIN", "FINANCE"], handler));

import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

/**
 * PATCH: Mark refund as PROCESSED (or FAILED).
 * Body: { status: "PROCESSED" | "FAILED" }
 */
async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();

  const session = req.session;
  const { refundId } = req.query;
  const { status } = req.body || {};

  if (!["PROCESSED", "FAILED"].includes(status)) {
    return res.status(400).json({ error: "status must be PROCESSED or FAILED" });
  }

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { creditNote: true },
  });

  if (!refund) {
    return res.status(404).json({ error: "Refund not found" });
  }

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status,
      processedAt: status === "PROCESSED" ? new Date() : null,
    },
    include: { creditNote: { include: { invoice: true } } },
  });

  await logAudit({
    actorId: session.userId,
    entity: "refund",
    entityId: refund.id,
    action: status === "PROCESSED" ? "processed" : "marked_failed",
  });

  return res.status(200).json(updated);
}

export default requireAuth(requireRole(["ADMIN", "FINANCE"], handler));

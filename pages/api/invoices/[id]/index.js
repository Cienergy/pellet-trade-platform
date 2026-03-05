import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";
import { logAudit } from "../../../../lib/audit";

async function handler(req, res) {
  const session = req.session;
  const invoiceId = req.query.id;

  if (req.method === "PATCH") {
    // Only ADMIN/FINANCE can set IRN placeholder
    const body = req.body || {};
    const updates = {};
    if (body.irn !== undefined) updates.irn = body.irn ? String(body.irn).trim() : null;
    if (body.irnDate !== undefined) updates.irnDate = body.irnDate ? new Date(body.irnDate) : null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update (irn, irnDate)" });
    }
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updates,
      include: {
        batch: { include: { product: true, site: true, order: { include: { org: true } } } },
        payments: true,
        creditNotes: { include: { refunds: true } },
      },
    });
    await logAudit({
      actorId: session.userId,
      entity: "invoice",
      entityId: invoice.id,
      action: "irn_updated",
    });
    return res.status(200).json(updated);
  }

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      batch: {
        include: {
          product: true,
          site: true,
          order: {
            include: {
              org: true,
            },
          },
        },
      },
      payments: true,
      creditNotes: { include: { refunds: true } },
    },
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  // Authorization: Buyers can only access invoices for their organization
  if (session.role === "BUYER") {
    const orgId = invoice.batch?.order?.orgId;
    if (!orgId || orgId !== session.orgId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  // Calculate payment status
  const totalPaid = invoice.payments
    .filter(p => p.verified)
    .reduce((sum, p) => sum + p.amount, 0);
  const hasUnverifiedPayments = invoice.payments.some(p => !p.verified);
  const isFullyPaid = totalPaid >= invoice.totalAmount;
  
  let calculatedStatus = "PENDING";
  if (isFullyPaid && !hasUnverifiedPayments) {
    calculatedStatus = "PAID";
  } else if (hasUnverifiedPayments) {
    calculatedStatus = "PENDING_VERIFICATION";
  } else if (totalPaid > 0) {
    calculatedStatus = "PARTIAL";
  }

  return res.status(200).json({
    ...invoice,
    calculatedStatus,
    totalPaid,
    remainingAmount: invoice.totalAmount - totalPaid,
  });
}

function withRole(handlerFn) {
  return (req, res) => {
    const session = req.session;
    if (req.method === "PATCH") {
      if (session.role !== "ADMIN" && session.role !== "FINANCE") {
        return res.status(403).json({ error: "Forbidden" });
      }
      return handlerFn(req, res);
    }
    return requireRole(["ADMIN", "FINANCE", "BUYER"], handlerFn)(req, res);
  };
}

export default requireAuth(withRole(handler));


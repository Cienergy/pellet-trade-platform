import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const session = req.session;
  const invoiceId = req.query.id;

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

export default requireAuth(
  requireRole(["ADMIN", "FINANCE", "BUYER"], handler)
);


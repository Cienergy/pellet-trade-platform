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
          OR: [
            { batch: { order: { orgId: session.orgId } } },
            { orgId: session.orgId },
          ],
        }
      : {};

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
      org: true,
      payments: true,
    },
  });

  // Calculate invoice status based on payments
  const invoicesWithStatus = invoices.map((invoice) => {
    const totalPaid = invoice.payments
      .filter(p => p.verified)
      .reduce((sum, p) => sum + p.amount, 0);
    const hasUnverifiedPayments = invoice.payments.some(p => !p.verified);
    const isFullyPaid = totalPaid >= invoice.totalAmount;
    
    let status = "PENDING";
    if (isFullyPaid && !hasUnverifiedPayments) {
      status = "PAID";
    } else if (hasUnverifiedPayments) {
      status = "PENDING_VERIFICATION";
    } else if (totalPaid > 0) {
      status = "PARTIAL";
    }

    return {
      ...invoice,
      calculatedStatus: status,
      orderId: invoice.batch?.order?.id || null,
    };
  });

  return res.status(200).json(invoicesWithStatus);
}

export default requireAuth(
  requireRole(["ADMIN", "FINANCE", "BUYER"], handler)
);

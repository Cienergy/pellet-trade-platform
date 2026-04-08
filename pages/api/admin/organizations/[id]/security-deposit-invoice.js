import prisma from "../../../../../lib/prisma";
import requireAuth from "../../../../../lib/requireAuth";
import requireRole from "../../../../../lib/requireRole";
import { logAudit } from "../../../../../lib/audit";

/**
 * POST: Create a one-time security deposit invoice for the organization (buyer).
 * No batch; orgId set, batchId null. Amount from org.securityDepositAmount or body.
 */
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { id: orgId } = req.query;
  const session = req.session;

  if (!orgId) {
    return res.status(400).json({ error: "Organization id is required" });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }

  const amount = req.body?.amount != null ? Number(req.body.amount) : (org.securityDepositAmount ?? 0);
  if (!amount || amount <= 0) {
    return res.status(400).json({
      error: "Security deposit amount is required. Set org.securityDepositAmount or pass body.amount",
    });
  }

  const existing = await prisma.invoice.findFirst({
    where: { orgId, invoiceType: "SECURITY_DEPOSIT" },
  });
  if (existing) {
    const paid = await prisma.payment.aggregate({
      where: { invoiceId: existing.id, verified: true },
      _sum: { amount: true },
    });
    const totalPaid = paid._sum?.amount ?? 0;
    if (totalPaid >= existing.totalAmount) {
      return res.status(400).json({
        error: "This buyer already has a security deposit invoice that is fully paid.",
      });
    }
  }

  const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/, "");
  const count = await prisma.invoice.count({
    where: { invoiceType: "SECURITY_DEPOSIT", number: { startsWith: `SD-${yyyymm}` } },
  });
  const number = `SD-${yyyymm}-${String(count + 1).padStart(3, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      orgId,
      number,
      subtotal: amount,
      gstType: "CGST_SGST",
      gstRate: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: amount,
      paymentTerm: "NET_15",
      status: "CREATED",
      invoiceType: "SECURITY_DEPOSIT",
    },
  });

  await logAudit({
    actorId: session?.userId,
    entity: "invoice",
    entityId: invoice.id,
    action: "security_deposit_created",
  });

  return res.status(201).json(invoice);
}

export default requireAuth(requireRole("ADMIN", handler));

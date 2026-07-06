import requireAuth from "../../lib/requireAuth";
import requireRole from "../../lib/requireRole";
import prisma from "../../lib/prisma";
import { logAudit } from "../../lib/audit";
import { buyerCanAccessInvoice } from "../../lib/invoiceAccess";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const session = req.session;
  const { invoiceId, amount, mode, proofUrl } = req.body;

  if (!invoiceId || !amount || !mode || !proofUrl) {
    return res.status(400).json({
      error: "invoiceId, amount, mode, and proofUrl are required",
    });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      batch: { include: { order: true } },
      payments: {
        where: { verified: true },
      },
    },
  });

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  if (!buyerCanAccessInvoice(session, invoice)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = invoice.totalAmount - totalPaid;
  const paymentAmount = Number(amount);

  if (Math.abs(paymentAmount - remainingAmount) > 0.01) {
    return res.status(400).json({
      error: `Payment amount must be exactly ₹${remainingAmount.toFixed(2)} (remaining amount). Payment terms: ${invoice.paymentTerm?.replace("NET_", "Net ") || "Net 30"}. No partial or excess payments allowed.`,
    });
  }

  if (paymentAmount <= 0) {
    return res.status(400).json({
      error: "Payment amount must be greater than 0",
    });
  }

  if (remainingAmount <= 0) {
    return res.status(400).json({
      error: "Invoice is already fully paid",
    });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: paymentAmount,
      mode,
      proofUrl,
      verified: false,
    },
  });

  await logAudit({
    actorId: session.userId,
    req,
    entity: "payment",
    entityId: payment.id,
    action: "created",
  });

  return res.status(201).json(payment);
}

export default requireAuth(requireRole("BUYER", handler));

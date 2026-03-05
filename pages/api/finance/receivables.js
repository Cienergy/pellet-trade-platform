import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

const PAYMENT_TERM_DAYS = { NET_15: 15, NET_30: 30, NET_60: 60, NET_90: 90 };

function getDueDate(invoice) {
  if (!invoice?.createdAt) return null;
  const d = new Date(invoice.createdAt);
  d.setDate(d.getDate() + (PAYMENT_TERM_DAYS[invoice.paymentTerm] || 30));
  return d;
}

function daysPastDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const invoices = await prisma.invoice.findMany({
    where: {
      batch: {
        order: { status: { not: "REJECTED" } },
      },
    },
    include: {
      batch: {
        include: {
          order: { include: { org: true } },
          product: true,
        },
      },
      payments: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = [];
  const dueIn7Days = [];
  const aging = { "0-30": [], "31-60": [], "61-90": [], "90+": [] };

  for (const inv of invoices) {
    const dueDate = getDueDate(inv);
    if (!dueDate) continue;

    const paid = inv.payments?.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0) || 0;
    const outstanding = inv.totalAmount - paid;
    if (outstanding <= 0) continue;

    const dueOnly = new Date(dueDate);
    dueOnly.setHours(0, 0, 0, 0);
    const daysOverdue = daysPastDue(dueDate);
    const daysUntilDue = Math.ceil((dueOnly - today) / (1000 * 60 * 60 * 24));

    const row = {
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      buyerName: inv.batch?.order?.org?.name,
      orderId: inv.batch?.orderId,
      dueDate: dueDate.toISOString(),
      outstanding,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      daysUntilDue,
    };

    if (daysOverdue > 0) {
      overdue.push(row);
      if (daysOverdue <= 30) aging["0-30"].push(row);
      else if (daysOverdue <= 60) aging["31-60"].push(row);
      else if (daysOverdue <= 90) aging["61-90"].push(row);
      else aging["90+"].push(row);
    } else if (daysUntilDue >= 0 && daysUntilDue <= 7) {
      dueIn7Days.push(row);
    }
  }

  const overdueCount = overdue.length;
  const overdueAmount = overdue.reduce((s, r) => s + r.outstanding, 0);
  const dueIn7Count = dueIn7Days.length;
  const dueIn7Amount = dueIn7Days.reduce((s, r) => s + r.outstanding, 0);

  return res.status(200).json({
    overdueCount,
    overdueAmount,
    dueIn7Count,
    dueIn7Amount,
    overdue,
    dueIn7Days,
    aging: {
      "0-30": { count: aging["0-30"].length, amount: aging["0-30"].reduce((s, r) => s + r.outstanding, 0), items: aging["0-30"] },
      "31-60": { count: aging["31-60"].length, amount: aging["31-60"].reduce((s, r) => s + r.outstanding, 0), items: aging["31-60"] },
      "61-90": { count: aging["61-90"].length, amount: aging["61-90"].reduce((s, r) => s + r.outstanding, 0), items: aging["61-90"] },
      "90+": { count: aging["90+"].length, amount: aging["90+"].reduce((s, r) => s + r.outstanding, 0), items: aging["90+"] },
    },
  });
}

export default requireAuth(requireRole("FINANCE", handler));

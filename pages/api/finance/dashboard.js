import prisma from "../../../lib/prisma";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

const PAYMENT_TERM_DAYS = { NET_30: 30, NET_60: 60, NET_90: 90 };

function getDueDate(inv) {
  if (!inv?.createdAt) return null;
  const d = new Date(inv.createdAt);
  d.setDate(d.getDate() + (PAYMENT_TERM_DAYS[inv.paymentTerm] || 30));
  return d;
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const [pendingPayments, invoices, totalRevenue, verifiedPayments] =
    await Promise.all([
      prisma.payment.count({
        where: {
          verified: false,
          invoice: {
            batch: {
              order: {
                status: { not: "REJECTED" }
              }
            }
          }
        }
      }),
      prisma.invoice.count({
        where: {
          batch: {
            order: {
              status: { not: "REJECTED" }
            }
          }
        }
      }),
      prisma.invoice.aggregate({
        where: {
          batch: {
            order: {
              status: { not: "REJECTED" }
            }
          }
        },
        _sum: { totalAmount: true },
      }),
      prisma.payment.count({ where: { verified: true } }),
    ]);

  const pendingAmount = await prisma.payment.aggregate({
    where: {
      verified: false,
      invoice: {
        batch: {
          order: {
            status: { not: "REJECTED" }
          }
        }
      }
    },
    _sum: { amount: true },
  });

  const allInvoices = await prisma.invoice.findMany({
    where: {
      batch: {
        order: { status: { not: "REJECTED" } },
      },
    },
    include: { payments: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdueCount = 0;
  let dueIn7Count = 0;

  for (const inv of allInvoices) {
    const paid = inv.payments?.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0) || 0;
    if (paid >= inv.totalAmount) continue;
    const due = getDueDate(inv);
    if (!due) continue;
    const dueOnly = new Date(due);
    dueOnly.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((dueOnly - today) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) overdueCount++;
    else if (daysUntil <= 7) dueIn7Count++;
  }

  return res.status(200).json({
    pendingPayments,
    pendingAmount: pendingAmount._sum.amount || 0,
    invoices,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    verifiedPayments,
    overdueCount,
    dueIn7Count,
  });
}

export default requireAuth(requireRole("FINANCE", handler));


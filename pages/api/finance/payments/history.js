import prisma from "../../../../lib/prisma";
import requireAuth from "../../../../lib/requireAuth";
import requireRole from "../../../../lib/requireRole";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Get payment review history from audit logs
  const history = await prisma.auditLog.findMany({
    where: {
      entity: "payment",
      action: {
        in: ["verified", "rejected"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to last 100 reviews
  });

  // Get payment details and reviewer info for each audit log entry
  const historyWithPayments = await Promise.all(
    history.map(async (log) => {
      const [payment, reviewer] = await Promise.all([
        prisma.payment.findUnique({
          where: { id: log.entityId },
          include: {
            invoice: {
              include: {
                batch: {
                  include: {
                    order: {
                      include: {
                        org: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        log.actorId ? prisma.user.findUnique({
          where: { id: log.actorId },
          select: {
            name: true,
            email: true,
          },
        }) : null,
      ]);

      return {
        id: log.id,
        paymentId: log.entityId,
        action: log.action,
        createdAt: log.createdAt,
        reviewer: reviewer ? {
          name: reviewer.name,
          email: reviewer.email,
        } : null,
        payment: payment ? {
          amount: payment.amount,
          mode: payment.mode,
          verified: payment.verified,
          invoiceNumber: payment.invoice?.number,
          organization: payment.invoice?.batch?.order?.org?.name,
        } : null,
      };
    })
  );

  return res.status(200).json(historyWithPayments);
}

export default requireAuth(requireRole("FINANCE", handler));


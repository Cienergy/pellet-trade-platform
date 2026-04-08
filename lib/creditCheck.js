/**
 * Credit and overdue checks for finance policy:
 * - Outstanding amount per org (invoices not fully paid)
 * - Overdue: invoices past due date with outstanding > 0
 * - Block new orders when org has overdue and blockNewOrdersIfOverdue
 * - Block/warn when outstanding > creditLimit
 */

const PAYMENT_TERM_DAYS = { NET_15: 15, NET_30: 30, NET_60: 60, NET_90: 90 };

function getDueDate(invoice) {
  if (invoice?.dueDateOverride) return new Date(invoice.dueDateOverride);
  if (!invoice?.createdAt) return null;
  const d = new Date(invoice.createdAt);
  d.setDate(d.getDate() + (PAYMENT_TERM_DAYS[invoice.paymentTerm] || 30));
  return d;
}

/**
 * Get outstanding and overdue summary for an organization.
 * @param {object} prisma - Prisma client
 * @param {string} orgId - Organization ID
 * @returns {Promise<{ outstanding: number, overdueAmount: number, hasOverdue: boolean, overdueCount: number }>}
 */
export async function getOrgOutstandingAndOverdue(prisma, orgId) {
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceType: { not: "SECURITY_DEPOSIT" },
      batch: {
        order: {
          orgId,
          status: { not: "REJECTED" },
        },
      },
    },
    include: { payments: true },
  });

  let outstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const inv of invoices) {
    const paid = inv.payments?.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0) || 0;
    const invOutstanding = inv.totalAmount - paid;
    if (invOutstanding <= 0) continue;

    outstanding += invOutstanding;
    const dueDate = getDueDate(inv);
    if (!dueDate) continue;
    const dueOnly = new Date(dueDate);
    dueOnly.setHours(0, 0, 0, 0);
    if (dueOnly < today) {
      overdueAmount += invOutstanding;
      overdueCount += 1;
    }
  }

  return {
    outstanding,
    overdueAmount,
    hasOverdue: overdueCount > 0,
    overdueCount,
  };
}

/**
 * Check if we should block new orders for this org (policy: block when overdue if flag set).
 * Optionally also block when outstanding > creditLimit.
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function canOrgPlaceNewOrder(prisma, orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { creditLimit: true, blockNewOrdersIfOverdue: true },
  });
  if (!org) return { allowed: false, reason: "Organization not found" };

  const { outstanding, hasOverdue } = await getOrgOutstandingAndOverdue(prisma, orgId);

  if (org.blockNewOrdersIfOverdue && hasOverdue) {
    return {
      allowed: false,
      reason: "New orders are blocked: this buyer has overdue invoices. Clear dues or contact finance.",
    };
  }

  if (org.creditLimit != null && org.creditLimit > 0 && outstanding > org.creditLimit) {
    return {
      allowed: false,
      reason: `Credit limit exceeded. Outstanding: ₹${outstanding.toLocaleString()}, Limit: ₹${org.creditLimit.toLocaleString()}.`,
    };
  }

  return { allowed: true };
}

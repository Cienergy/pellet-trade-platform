/**
 * Resolve owning org for batch-linked or standalone (e.g. SECURITY_DEPOSIT) invoices.
 */
export function getInvoiceOrgId(invoice) {
  if (!invoice) return null;
  return invoice.batch?.order?.orgId ?? invoice.orgId ?? null;
}

/**
 * Buyers may only access invoices for their organization.
 */
export function buyerCanAccessInvoice(session, invoice) {
  if (!session || session.role !== "BUYER") return true;
  const orgId = getInvoiceOrgId(invoice);
  return Boolean(orgId && session.orgId && orgId === session.orgId);
}

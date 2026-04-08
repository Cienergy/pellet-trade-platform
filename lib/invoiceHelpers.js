/**
 * Helpers for batch invoices (single STANDARD or ADVANCE+BALANCE).
 * Batches now have invoices[]; use these for backward-compatible "primary" and totals.
 */

export function getPrimaryInvoice(batch) {
  const invs = batch?.invoices;
  if (!invs?.length) return null;
  if (invs.length === 1) return invs[0];
  const standard = invs.find((i) => i.invoiceType === "STANDARD");
  if (standard) return standard;
  return invs[0];
}

export function getBatchTotalAmount(batch) {
  const invs = batch?.invoices;
  if (!invs?.length) return 0;
  return invs.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
}

export function getBatchPaidAmount(batch) {
  const invs = batch?.invoices;
  if (!invs?.length) return 0;
  return invs.reduce((sum, inv) => {
    const paid = (inv.payments || []).filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);
    return sum + paid;
  }, 0);
}

export function batchHasUnverifiedPayments(batch) {
  const invs = batch?.invoices;
  if (!invs?.length) return false;
  return invs.some((inv) => (inv.payments || []).some((p) => !p.verified));
}

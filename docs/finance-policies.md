# Finance policies and receivables (internal)

This page documents organization-level finance policy fields, invoice shapes,
receivables calculations, credit notes, refunds, dunning reminders, and security
deposit invoices as implemented in the API handlers. Treat it as the engineering
reference when changing Finance, Admin buyer policy, or buyer payment flows.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Finance enums and persisted fields | `prisma/schema.prisma` |
| Admin organization policy updates | `pages/api/admin/organizations/[id].js` |
| Batch auto-invoicing | `pages/api/orders/[orderId]/batches.js` |
| Credit and overdue gates | `lib/creditCheck.js` |
| Invoice organization scoping | `lib/invoiceAccess.js` |
| Buyer payment proof and payment creation | `pages/api/uploads/payment-proof.js`, `pages/api/payments.js` |
| Receivables and aging | `pages/api/finance/receivables.js` |
| Credit notes | `pages/api/finance/credit-notes.js` |
| Refunds | `pages/api/finance/refunds.js`, `pages/api/finance/refunds/[refundId].js` |
| Dunning reminders | `pages/api/finance/dunning-reminder.js` |
| Security deposit invoices | `pages/api/admin/organizations/[id]/security-deposit-invoice.js` |

## Organization finance policy fields

Admins update buyer finance policy through:

```http
PATCH /api/admin/organizations/[id]
```

The handler accepts only known finance fields and ignores invalid enum values by
setting nullable enum fields to `null` or omitting invalid numeric updates.

| Field | Persisted on | Constraints / behavior |
| --- | --- | --- |
| `buyerMargin` | `Organization` | Numeric or `null`; used as buyer-level margin data. |
| `defaultPaymentTerm` | `Organization` | One of `NET_15`, `NET_30`, `NET_60`, `NET_90`; invalid values become `null`. |
| `defaultPaymentMode` | `Organization` | One of `NET_TERMS`, `ADVANCE_BALANCE`, `PAY_BEFORE_DISPATCH`, `STANDARD`; invalid values become `null`. |
| `advancePercent` | `Organization` | `0` to `100`; used only when `defaultPaymentMode` is `ADVANCE_BALANCE` and the value is greater than `0` and less than `100`. |
| `earlyPayDiscountPercent` | `Organization` | `0` to `100`; copied to generated invoices as metadata. |
| `earlyPayDiscountDays` | `Organization` | Non-negative number; copied to generated invoices as metadata. |
| `retentionPercent` | `Organization` | `0` to `100`; copied to generated invoices when both retention fields are present. |
| `retentionDays` | `Organization` | Non-negative number; used to derive `Invoice.retentionDueDate` from batch delivery date. |
| `securityDepositAmount` | `Organization` | Non-negative number; default amount for security deposit invoice creation. |
| `creditLimit` | `Organization` | Numeric or `null`; values greater than `0` participate in order and batch gates. |
| `blockNewOrdersIfOverdue` | `Organization` | Boolean; when true, overdue invoice balance blocks order and batch creation. |

Organization updates are audit logged as `organization/updated_margin_terms`.

## Invoice shapes from buyer policy

Batch creation (`POST /api/orders/[orderId]/batches`) reads the buyer
organization policy and creates invoices before setting the batch to `INVOICED`.

| Policy | Invoice records | Notes |
| --- | --- | --- |
| `defaultPaymentMode = ADVANCE_BALANCE` and `0 < advancePercent < 100` | One `ADVANCE` invoice and one linked `BALANCE` invoice | Each invoice gets its own GST calculation. The balance invoice stores `parentInvoiceId` pointing at the advance invoice. |
| `defaultPaymentMode = PAY_BEFORE_DISPATCH` | One `STANDARD` invoice | `dueDateOverride` is the batch delivery date, or seven days from creation when the batch has no delivery date. |
| `NET_TERMS`, `STANDARD`, missing, or invalid advance policy | One `STANDARD` invoice | Payment term falls back to `NET_30` unless the organization has a valid default term. |

Early-pay and retention fields are copied onto generated invoices, but the
current payment API still requires the buyer to pay the exact remaining invoice
amount. There is no automatic early-payment discount or retention withholding in
`pages/api/payments.js`.

## Credit and overdue gates

`canOrgPlaceNewOrder` runs before buyer order creation and before Ops batch
creation. It blocks when either rule is true:

- `blockNewOrdersIfOverdue` is true and the organization has at least one
  overdue non-security-deposit invoice with outstanding verified-payment balance.
- `creditLimit` is greater than `0` and outstanding non-security-deposit invoice
  balance exceeds that limit.

Due dates use `Invoice.dueDateOverride` when present; otherwise they are derived
from `Invoice.createdAt + paymentTerm` using Net 15/30/60/90 days.

Important constraints:

- `SECURITY_DEPOSIT` invoices are excluded from credit and overdue gates.
- Rejected orders are excluded from the outstanding and overdue calculation.
- Only verified payments reduce outstanding balance.

## Receivables and aging

Finance receivables are served by:

```http
GET /api/finance/receivables
```

The endpoint is restricted to `FINANCE` and returns only batch-linked invoices
whose parent order is not `REJECTED`. Standalone security deposit invoices have
no batch, so they are not included in this receivables response.

The response groups open balances into:

- `overdue`
- `dueIn7Days`
- aging buckets: `0-30`, `31-60`, `61-90`, `90+`

Outstanding balance is calculated as:

```text
invoice.totalAmount - sum(verified payment.amount)
```

Rows with `outstanding <= 0` are skipped.

## Credit notes and refunds

Credit notes are managed by Finance or Admin:

```http
GET  /api/finance/credit-notes
POST /api/finance/credit-notes
```

Create payload:

```json
{
  "invoiceId": "invoice_uuid",
  "amount": 25000,
  "reason": "Adjustment after quality review"
}
```

Constraints:

- `invoiceId` and a positive `amount` are required.
- The invoice must exist.
- A supplied `number` is used after trimming; otherwise the handler generates
  `CN-YYYYMM-xxxxxx` from the current timestamp.
- New credit notes are created with status `ISSUED`.
- Creation is audit logged as `creditNote/created`.

Refunds are created against credit notes:

```http
POST  /api/finance/refunds
PATCH /api/finance/refunds/[refundId]
```

Create payload:

```json
{
  "creditNoteId": "credit_note_uuid",
  "amount": 10000
}
```

Patch payload:

```json
{
  "status": "PROCESSED"
}
```

Constraints:

- `creditNoteId` and a positive `amount` are required.
- New refunds start as `PENDING`.
- Only `PROCESSED` refunds count against the credit note balance when creating
  another refund.
- Refund status can be changed only to `PROCESSED` or `FAILED`.
- `processedAt` is set only when status becomes `PROCESSED`; failed refunds clear
  `processedAt`.
- Audit actions are `refund/created`, `refund/processed`, and
  `refund/marked_failed`.

## Dunning reminders

Dunning is currently audit-log only:

```http
POST /api/finance/dunning-reminder
```

Payload:

```json
{
  "invoiceId": "invoice_uuid"
}
```

The handler validates that the invoice exists, writes an audit entry
`invoice/dunning_reminder_sent`, and returns a success message. It does not send
email, SMS, WhatsApp, or any external notification.

## Security deposit invoices

Admins create standalone buyer security deposit invoices through:

```http
POST /api/admin/organizations/[id]/security-deposit-invoice
```

Payload is optional when the organization already has `securityDepositAmount`:

```json
{
  "amount": 50000
}
```

Behavior:

- The amount comes from `body.amount`, otherwise `Organization.securityDepositAmount`.
- Amount must be greater than `0`.
- The invoice has `batchId = null`, `orgId = [id]`, and
  `invoiceType = SECURITY_DEPOSIT`.
- GST fields are set to zero and `paymentTerm` is `NET_15`.
- Invoice numbers use `SD-YYYYMM-NNN`.
- If an existing security deposit invoice for the buyer is fully paid, the
  handler blocks creating another one.
- Creation is audit logged as `invoice/security_deposit_created`.

Standalone invoices rely on `Invoice.orgId` for ownership. Buyer invoice and
payment-proof access checks use `getInvoiceOrgId`, which resolves
`batch.order.orgId` for batch invoices and falls back to `invoice.orgId` for
security deposits.

# Finance policies (internal)

This page documents the finance controls that affect order creation, invoicing,
collections, and buyer-facing payment flows. Use it when changing buyer policy
fields, receivables logic, credit notes, refunds, dunning reminders, or security
deposit invoices.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Organization policy fields and finance models | `prisma/schema.prisma` |
| Admin policy updates | `pages/api/admin/organizations/[id].js` |
| Credit and overdue order gates | `lib/creditCheck.js` |
| Batch auto-invoicing | `pages/api/orders/[orderId]/batches.js` |
| Manual batch invoice creation | `pages/api/invoices/create.js` |
| Multi-invoice batch helpers | `lib/invoiceHelpers.js` |
| Security deposit invoices | `pages/api/admin/organizations/[id]/security-deposit-invoice.js` |
| Credit notes | `pages/api/finance/credit-notes.js` |
| Refunds | `pages/api/finance/refunds.js`, `pages/api/finance/refunds/[refundId].js` |
| Dunning reminders | `pages/api/finance/dunning-reminder.js` |
| Receivables and finance KPIs | `pages/api/finance/receivables.js`, `pages/api/finance/dashboard.js` |

## Organization policy fields

`ADMIN` users update buyer policy fields through
`PATCH /api/admin/organizations/[id]`.

| Field | Current use |
| --- | --- |
| `defaultPaymentTerm` | Allowed values are `NET_15`, `NET_30`, `NET_60`, and `NET_90`. Batch auto-invoicing and manual Finance invoice creation fall back to the buyer default, then to `NET_30`. |
| `defaultPaymentMode` | Allowed values are `NET_TERMS`, `ADVANCE_BALANCE`, `PAY_BEFORE_DISPATCH`, and `STANDARD`. Batch auto-invoicing uses this to decide invoice shape and due-date overrides. |
| `advancePercent` | Used only when `defaultPaymentMode` is `ADVANCE_BALANCE` and the value is greater than `0` and less than `100`. |
| `earlyPayDiscountPercent`, `earlyPayDiscountDays` | Copied onto generated invoices for display/reference; the current payment API still requires the exact remaining invoice amount. |
| `retentionPercent`, `retentionDays` | Copied onto generated invoices. Retention due dates are derived from batch delivery date when enough data is present. |
| `securityDepositAmount` | Default amount for one-off security deposit invoices. |
| `creditLimit` | Blocks new buyer orders and Ops batch creation when outstanding non-security-deposit invoices exceed the limit. |
| `blockNewOrdersIfOverdue` | Blocks new buyer orders and Ops batch creation when the buyer has overdue non-security-deposit invoices. |

## Credit and overdue gates

`canOrgPlaceNewOrder` is called by:

- `POST /api/orders` before a buyer creates a new order.
- `POST /api/orders/[orderId]/batches` before Ops creates a batch for an
  accepted order.

The helper calculates outstanding and overdue amounts from batch-linked invoices
for non-rejected orders. It excludes `SECURITY_DEPOSIT` invoices.

Due date resolution:

1. Use `Invoice.dueDateOverride` when present.
2. Otherwise use `Invoice.createdAt + paymentTerm`, with `NET_30` as the
   fallback when the term is missing or unknown.

Blocking rules:

- If `blockNewOrdersIfOverdue` is enabled and any invoice is overdue with
  outstanding balance, the request returns `403`.
- If `creditLimit` is greater than zero and outstanding balance is above the
  limit, the request returns `403`.

## Invoice shapes

Batch invoice creation stores GST and payment policy fields at creation time.
See `docs/order-lifecycle.md` for the full order and batch state machine.

| Flow | Invoice records |
| --- | --- |
| Standard or net-terms batch | One `STANDARD` invoice. |
| `ADVANCE_BALANCE` batch with valid `advancePercent` | One `ADVANCE` invoice and one linked `BALANCE` invoice. |
| `PAY_BEFORE_DISPATCH` batch | One invoice with `dueDateOverride` set to the batch delivery date, or seven days from creation when delivery date is absent. |
| Security deposit | One standalone `SECURITY_DEPOSIT` invoice with `orgId` set and `batchId` null. |

`lib/invoiceHelpers.js` provides helper totals for code that receives
`batch.invoices[]`:

- `getPrimaryInvoice` prefers `STANDARD`, otherwise the first invoice.
- `getBatchTotalAmount` sums all invoice totals on the batch.
- `getBatchPaidAmount` sums verified payments across all batch invoices.
- `batchHasUnverifiedPayments` reports whether any batch invoice has pending
  payment proof.

## Security deposits

`POST /api/admin/organizations/[id]/security-deposit-invoice` is `ADMIN` only.
It creates a standalone invoice:

- `invoiceType = "SECURITY_DEPOSIT"`
- `orgId = organization id`
- `batchId = null`
- `paymentTerm = "NET_15"`
- GST fields set to zero

The handler uses `body.amount` when provided; otherwise it uses
`Organization.securityDepositAmount`. It rejects missing or non-positive amounts.

If a security deposit invoice already exists and verified payments cover its
total amount, the handler rejects creating another one. If the existing invoice
is not fully paid, the current handler still allows a new security deposit
invoice.

Security deposit invoices are not part of the batch-linked credit/overdue gate
or receivables aging calculations.

## Credit notes and refunds

`GET /api/finance/credit-notes` and `POST /api/finance/credit-notes` are
available to `ADMIN` and `FINANCE`.

Credit note creation rules:

- Body requires `invoiceId` and a positive `amount`.
- `reason` is optional and truncated to 500 characters.
- `number` is optional; otherwise the handler generates a `CN-YYYYMM-xxxxxx`
  number.
- The current API creates credit notes with `status = "ISSUED"`.

Refund flow:

1. `POST /api/finance/refunds` creates a `PENDING` refund for a credit note.
2. The handler sums existing `PROCESSED` refunds and rejects amounts that would
   exceed the credit note amount.
3. `PATCH /api/finance/refunds/[refundId]` marks the refund `PROCESSED` or
   `FAILED`.
4. `PROCESSED` sets `processedAt`; `FAILED` clears it.

Credit note and refund mutations call `logAudit`. The current create routes pass
extra details as `meta`, while `logAudit` persists only a parameter named
`metadata`; do not rely on those extra details being stored until the route and
helper parameter names are aligned.

## Dunning and receivables

`POST /api/finance/dunning-reminder` is available to `ADMIN` and `FINANCE`.
The current implementation is audit-only: it records
`invoice:dunning_reminder_sent`, but does not send email or any external
message. The route currently passes invoice number and buyer name as `meta`;
because `logAudit` persists only `metadata`, those details are not stored by the
current helper.

`GET /api/finance/receivables` is `FINANCE` only and reports batch-linked
invoices for non-rejected orders:

- overdue count and amount
- due-in-seven-days count and amount
- overdue rows grouped into `0-30`, `31-60`, `61-90`, and `90+` day buckets

`GET /api/finance/dashboard` uses the same payment-term due-date approach for
overdue and due-soon KPIs, plus pending payment counts and top overdue buyers.

## Operational notes

- Credit/overdue gates run before buyer order creation and before Ops batch
  creation; fixing a blocked buyer usually means verifying payments, adjusting
  credit policy fields, or clearing overdue invoices.
- Finance policy fields are copied to invoices at creation time. Changing an
  organization policy does not recalculate existing invoice totals, due dates,
  discounts, or retention fields.
- Security deposit invoices use `orgId` ownership rather than batch ownership;
  see `docs/rbac.md` for buyer invoice access rules.
- Dunning currently creates an audit trail only. Do not assume a reminder was
  delivered outside the app.

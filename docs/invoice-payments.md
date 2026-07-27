# Invoice payments and proof review (internal)

This page documents how invoices, payment proof uploads, and Finance review
work in the current app. Treat it as the engineering reference when changing
invoice shapes, payment access checks, Supabase upload setup, or payment
verification behavior.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Invoice and payment schema | `prisma/schema.prisma` |
| Batch auto-invoicing | `pages/api/orders/[orderId]/batches.js` |
| Manual batch invoice creation | `pages/api/invoices/create.js` |
| Invoice list/detail/PDF | `pages/api/invoices/index.js`, `pages/api/invoices/[id]/index.js`, `pages/api/invoices/[id]/pdf.js` |
| Buyer invoice ownership checks | `lib/invoiceAccess.js` |
| Payment proof upload | `pages/api/uploads/payment-proof.js` |
| Buyer payment submission | `pages/api/payments.js` |
| Finance payment queue/history | `pages/api/finance/payments.js`, `pages/api/finance/payments/history.js` |
| Payment approval/rejection | `pages/api/payments/[paymentId]/verify.js` |
| Security deposit invoices | `pages/api/admin/organizations/[id]/security-deposit-invoice.js` |
| Receivables, aging, and credit gates | `pages/api/finance/receivables.js`, `lib/creditCheck.js` |

## Invoice shapes

Invoices are stored in `Invoice` and can either belong to an order batch
(`batchId`) or directly to an organization (`orgId`) for standalone security
deposit invoices.

| `invoiceType` | Created by | Ownership | Notes |
| --- | --- | --- | --- |
| `STANDARD` | Ops batch creation or Finance manual invoice creation | `batch.order.orgId` | Default shape for most buyer policies. |
| `ADVANCE` | Ops batch creation when the buyer policy is `ADVANCE_BALANCE` with `0 < advancePercent < 100` | `batch.order.orgId` | Must be fully verified before Ops can start processing. |
| `BALANCE` | Same batch creation flow as `ADVANCE` | `batch.order.orgId` | Linked to the advance invoice by `parentInvoiceId`. |
| `SECURITY_DEPOSIT` | Admin security deposit endpoint | `orgId` with no batch | Uses `NET_15` and 0% GST fields. |

Batch auto-invoicing uses `quantityMT * product.pricePMT` as transaction value,
calculates GST from buyer state and seller site state, stores immutable GST
amounts, and then moves the batch to `INVOICED`.

## Buyer payment submission

The buyer UI (`components/PayInvoiceForm.js`) submits payment in two steps:

1. `POST /api/uploads/payment-proof`
   - Requires multipart `invoiceId` and `file`.
   - Requires role `BUYER`.
   - Verifies the invoice belongs to the buyer's `session.orgId`.
   - Uploads to the Supabase Storage bucket `payment-proof`.
   - Returns a public `proofUrl`.
2. `POST /api/payments`
   - Requires JSON `invoiceId`, `amount`, `mode`, and `proofUrl`.
   - Requires role `BUYER`.
   - Re-checks buyer invoice access.
   - Accepts only the exact remaining invoice amount after verified payments.
   - Creates a `Payment` with `verified=false` and logs a payment audit record.

The payment amount input is read-only in the UI, but the API enforces the same
exact remaining amount rule. Partial, excess, zero, and already-paid submissions
are rejected.

## Finance review and batch gates

Finance reviews pending payments through `GET /api/finance/payments`; the queue
returns unverified payments for non-rejected batch orders. The current queue does
not include standalone security deposit payments because it filters through
`invoice.batch.order`.

`POST /api/payments/[paymentId]/verify` is available to `ADMIN` and `FINANCE`.
The request body is `{ "approve": true }` to approve or `{ "approve": false }`
to reject.

- Approval sets `verified=true` and `verifiedAt=now`.
- Rejection sets `verified=false` and clears `verifiedAt`.
- Approved non-advance batch payments move the batch to `PAYMENT_APPROVED`.
- Approved advance payments move the batch to `PAYMENT_APPROVED` only after
  verified payments cover the full advance invoice amount.
- Rejection does not roll back a batch that was already advanced.
- Review actions are logged as payment audit records and displayed by
  `GET /api/finance/payments/history`.

Ops can start a batch with `PATCH /api/batches/[batchId]/start` only after the
payment gate passes:

| Batch invoice shape | Start requirement |
| --- | --- |
| One or more `ADVANCE` invoices | Verified advance payments cover the total advance invoice amount. |
| No `ADVANCE` invoices | At least one batch invoice has a verified payment. |

## Access and visibility

- `GET /api/invoices` returns all invoices to Admin/Finance and only invoices
  owned by the buyer's organization to Buyer users. Buyer matching covers both
  batch-linked invoices (`batch.order.orgId`) and org-linked security deposits
  (`orgId`).
- `GET /api/invoices/[id]`, `GET /api/invoices/[id]/pdf`,
  `POST /api/uploads/payment-proof`, and `POST /api/payments` enforce the same
  buyer organization boundary.
- `PATCH /api/invoices/[id]` is Admin/Finance-only and currently updates IRN
  placeholder fields (`irn`, `irnDate`).

## Operational setup

Payment proof uploads require these environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Create a public Supabase Storage bucket named `payment-proof`. Without the
bucket or credentials, proof upload requests fail and buyers cannot create
payments through the normal UI.

If production logs show Prisma `P2022` errors for invoice columns such as
`orgId`, `invoiceType`, `parentInvoiceId`, or `dueDateOverride`, the database is
behind the Prisma schema. Run `npx prisma migrate deploy` with the production
`DATABASE_URL`; `scripts/fix-invoice-schema-drift.sql` is available as a manual
repair script when migrations cannot be run immediately.

## Known constraints

- Payment proof files are uploaded before the `Payment` row is created. If the
  second step fails, an orphaned object may remain in Supabase Storage.
- The API does not validate proof file type or size beyond Formidable parsing
  and Supabase upload acceptance.
- Payment mode is stored as a string from the buyer request, not an enum.
- Receipt endpoints under `pages/api/payments/[paymentId]/receipt.js` and
  `pages/api/invoices/receipts/[paymentId].js` are deprecated and return `410`.
- Finance receivables and credit gates intentionally exclude
  `SECURITY_DEPOSIT` invoices.

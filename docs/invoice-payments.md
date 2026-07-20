# Invoice payments and buyer finance policy (internal)

This page documents the buyer finance policy, invoice shapes, payment proof
upload, and finance verification behavior implemented in the API handlers. Use
it with [Order lifecycle](./order-lifecycle.md) when changing payment modes,
security deposits, credit gates, or invoice payment routes.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Finance policy fields and invoice/payment schema | `prisma/schema.prisma` |
| Admin buyer policy updates | `pages/api/admin/organizations/[id].js` |
| Batch invoice generation | `pages/api/orders/[orderId]/batches.js` |
| Manual batch invoice creation | `pages/api/invoices/create.js` |
| Security deposit invoice creation | `pages/api/admin/organizations/[id]/security-deposit-invoice.js` |
| Buyer invoice org scoping | `lib/invoiceAccess.js` |
| Payment proof upload | `pages/api/uploads/payment-proof.js` |
| Buyer payment creation | `pages/api/payments.js` |
| Finance payment verification | `pages/api/payments/[paymentId]/verify.js` |
| Processing payment gate | `pages/api/batches/[batchId]/start.js` |
| Credit and overdue gates | `lib/creditCheck.js` |

## How the pieces fit

```text
Admin updates Organization policy
        |
        +--> Ops creates an accepted order batch
        |        |
        |        v
        |    API creates STANDARD or ADVANCE/BALANCE invoices
        |
        +--> Admin creates a standalone SECURITY_DEPOSIT invoice
                 |
                 v
Buyer uploads proof to Supabase and posts an exact-remaining Payment
        |
        v
Finance/Admin verifies or rejects the Payment
        |
        v
Batch invoices can move to PAYMENT_APPROVED and then IN_PROGRESS when gates pass
```

Batch-linked invoices belong to the buyer through
`invoice.batch.order.orgId`. Security deposit invoices are standalone invoices
with `batchId = null` and `orgId` set directly. Shared helpers resolve both
shapes before allowing buyer access.

## Buyer finance policy fields

Admins update buyer policy with `PATCH /api/admin/organizations/[id]`.

| Field | Accepted values | Runtime behavior |
| --- | --- | --- |
| `buyerMargin` | number or null | Stored on the organization for reporting/policy context. |
| `defaultPaymentTerm` | `NET_15`, `NET_30`, `NET_60`, `NET_90`, or null | Copied onto newly generated invoices. Invalid or missing terms fall back to `NET_30` during invoice creation. |
| `defaultPaymentMode` | `NET_TERMS`, `ADVANCE_BALANCE`, `PAY_BEFORE_DISPATCH`, `STANDARD`, or null | Selects the invoice shape created for new batches. Missing mode behaves like `NET_TERMS`. |
| `advancePercent` | 0 through 100 or null | Only active when `defaultPaymentMode = ADVANCE_BALANCE` and the value is greater than 0 and less than 100. |
| `earlyPayDiscountPercent` / `earlyPayDiscountDays` | non-negative values or null | Copied to new invoices and displayed on invoice PDFs. Payment amount calculation does not automatically apply the discount. |
| `retentionPercent` / `retentionDays` | non-negative values or null | Copied to new invoices; `retentionDueDate` is derived from batch delivery date when enough data exists. |
| `securityDepositAmount` | non-negative number or null | Default amount for the admin security deposit invoice endpoint when the request body omits `amount`. |
| `creditLimit` | number or null | Blocks buyer order creation and Ops batch creation when outstanding non-security-deposit invoices exceed the limit. |
| `blockNewOrdersIfOverdue` | boolean | Blocks buyer order creation and Ops batch creation when the org has overdue non-security-deposit invoices. |

Policy changes affect invoices created after the change. Existing invoices keep
their stored terms, discounts, retention dates, and totals.

## Invoice shapes

### Standard invoice

Created when the organization payment mode is `NET_TERMS`, `STANDARD`, missing,
or any mode that does not activate the advance/balance branch.

- `invoiceType = "STANDARD"`.
- `subtotal = batch.quantityMT * product.pricePMT`.
- GST is calculated from buyer state, seller site state, and the configured GST
  rate.
- If payment mode is `PAY_BEFORE_DISPATCH`, `dueDateOverride` is the batch
  `deliveryAt`, or seven days from creation when `deliveryAt` is absent.

### Advance and balance invoices

Created only when:

```text
defaultPaymentMode = ADVANCE_BALANCE
0 < advancePercent < 100
```

The batch handler creates:

- one `ADVANCE` invoice for the advance portion, with number suffix `-A`;
- one linked `BALANCE` invoice for the remaining portion, with number suffix
  `-B` and `parentInvoiceId` pointing to the advance invoice.

GST is calculated separately for each portion. Ops can start processing after
verified payments cover all advance invoices on the batch; the balance invoice
does not need to be verified before processing starts.

### Security deposit invoice

Admins create standalone security deposit invoices with:

```http
POST /api/admin/organizations/[orgId]/security-deposit-invoice
Content-Type: application/json

{ "amount": 50000 }
```

Behavior:

- Role: `ADMIN`.
- Amount comes from `body.amount`, otherwise `org.securityDepositAmount`.
- Created invoice has `invoiceType = "SECURITY_DEPOSIT"`, `batchId = null`,
  `orgId = orgId`, `paymentTerm = "NET_15"`, GST rate and amount set to zero,
  and a number like `SD-YYYYMM-001`.
- Buyers can view and pay their own org's security deposit invoice through the
  same invoice/payment routes as batch invoices.
- Credit and overdue gates ignore security deposit invoices.

Pitfall: the route blocks creation only when an existing security deposit
invoice for the buyer is already fully paid. Avoid repeated calls for the same
buyer while an earlier security deposit invoice is still unpaid unless duplicate
deposit invoices are intentional.

## Buyer payment flow

### 1. Upload proof

```http
POST /api/uploads/payment-proof
Content-Type: multipart/form-data

invoiceId=<invoice-id>
file=@proof.pdf
```

The route:

- requires a `BUYER` session;
- checks the invoice belongs to `session.orgId`;
- uploads the file to the Supabase Storage bucket named `payment-proof`;
- returns `{ "proofUrl": "<public-url>" }`.

This step does not create a `Payment` row. The returned `proofUrl` must be sent
to the payment creation endpoint.

### 2. Create payment

```http
POST /api/payments
Content-Type: application/json

{
  "invoiceId": "inv_123",
  "amount": 118000,
  "mode": "BANK_TRANSFER",
  "proofUrl": "https://..."
}
```

The route:

- requires a `BUYER` session;
- checks the invoice belongs to `session.orgId`;
- calculates remaining amount as `invoice.totalAmount - verifiedPayments`;
- rejects partial or excess payments unless the submitted amount is within
  `0.01` of the remaining amount;
- creates a `Payment` with `verified = false`.

Unverified payments do not reduce the remaining amount used by this endpoint.
If a buyer resubmits while a previous payment is still pending verification,
the second submission can target the same remaining amount and must be cleaned
up by Finance/Admin through verification or rejection.

### 3. Verify or reject payment

```http
POST /api/payments/[paymentId]/verify
Content-Type: application/json

{ "approve": true }
```

The route accepts `ADMIN` and `FINANCE`.

| Request body | Payment effect | Batch effect |
| --- | --- | --- |
| `{ "approve": true }` or omitted `approve` | Sets `verified = true` and `verifiedAt = now`. | For `ADVANCE`, moves the batch to `PAYMENT_APPROVED` only after verified advance payments cover the advance total. For non-advance batch invoices, moves the batch to `PAYMENT_APPROVED`. |
| `{ "approve": false }` | Sets `verified = false` and clears `verifiedAt`. | Does not roll back a batch that already moved forward. |

`PATCH /api/batches/[batchId]/start` independently enforces the same practical
gate: advance batches require full verified advance payment; standard batches
require at least one verified payment.

## Credit and overdue gates

`canOrgPlaceNewOrder` runs in two places:

- buyer order creation: `POST /api/orders`;
- Ops/Admin batch creation: `POST /api/orders/[orderId]/batches`.

The helper only considers invoices where `invoiceType != "SECURITY_DEPOSIT"`
and the related order is not rejected. Outstanding amount is based on verified
payments only. Due date is:

```text
invoice.dueDateOverride ?? invoice.createdAt + paymentTerm days
```

If `blockNewOrdersIfOverdue` is true and any qualifying invoice is overdue, the
new order or batch is rejected. If `creditLimit` is greater than zero and
qualifying outstanding amount exceeds it, the request is rejected with a credit
limit message.

## Operational checklist

- Create a public Supabase Storage bucket named `payment-proof` when payment
  proof uploads are enabled.
- Keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured in the runtime
  environment used by API routes.
- Apply migrations before enabling security deposits or advanced payment modes;
  production databases missing invoice commercial columns can use
  `scripts/fix-invoice-schema-drift.sql` as the one-shot repair script, then
  run `npx prisma migrate deploy`.
- Do not use `GET /api/invoices/receipts/[paymentId]` for new work. It returns
  HTTP 410; use the in-app invoice and payment views instead.

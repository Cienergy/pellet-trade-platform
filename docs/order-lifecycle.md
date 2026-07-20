# Order lifecycle (internal)

This page documents the order, batch, invoice, payment, and dispatch flow as
implemented in the API handlers. Treat it as the engineering reference when
changing status transitions, payment gates, or Ops/Finance workflows.
For buyer policy fields, proof uploads, security deposits, and payment
verification details, see [Invoice payments and buyer finance policy](./invoice-payments.md).

## Source of truth

| Concern | Codepath |
| --- | --- |
| Status enums and finance policy fields | `prisma/schema.prisma` |
| Buyer order create/list | `pages/api/orders/index.js` |
| Ops accept/reject | `pages/api/orders/[orderId]/accept.js`, `pages/api/orders/[orderId]/reject.js` |
| Ops batch create and auto-invoice | `pages/api/orders/[orderId]/batches.js` |
| Buyer payment proof | `pages/api/payments.js` |
| Finance payment verification | `pages/api/payments/[paymentId]/verify.js` |
| Ops start processing | `pages/api/batches/[batchId]/start.js` |
| Ops dispatch metadata | `pages/api/ops/dispatch.js` |
| Ops batch completion | `pages/api/batches/[batchId]/complete.js` |
| Dispatch timeline | `pages/api/ops/dispatch-timeline.js` |
| Credit and overdue gates | `lib/creditCheck.js` |
| Invoice org scoping | `lib/invoiceAccess.js` |

## Roles in the flow

- **BUYER** creates orders and uploads payment proof for invoices belonging to
  the buyer's organization.
- **OPS** and **ADMIN** accept/reject orders, create batches, start processing,
  dispatch material, and complete batches.
- **FINANCE** and **ADMIN** verify or reject submitted payments.

## Order states

```text
PENDING_APPROVAL --accept--> ACCEPTED --all batches complete and requested MT met--> COMPLETED
PENDING_APPROVAL --reject--> REJECTED
```

Notes:

- `POST /api/orders` creates buyer orders directly in `PENDING_APPROVAL`.
- Batch creation is allowed only while the order is `ACCEPTED`.
- `OrderStatus.CREATED` and `OrderStatus.IN_PROGRESS` exist in the Prisma enum,
  but the current order API handlers do not set them in the normal web flow.
- An order is completed only by `PATCH /api/batches/[batchId]/complete`, and
  only when every batch on the order is `COMPLETED` and total batched MT is at
  least `requestedQuantityMT`.

## Batch states

```text
CREATED --auto invoice--> INVOICED --payment verified--> PAYMENT_APPROVED
PAYMENT_APPROVED --start--> IN_PROGRESS --dispatch/complete--> COMPLETED
```

Notes:

- `POST /api/orders/[orderId]/batches` creates the batch as `CREATED`, creates
  invoice records, then updates the batch to `INVOICED`.
- `BatchStatus.PAID` exists in the Prisma enum and UI labels, but the current
  payment verification handler sets `PAYMENT_APPROVED`, not `PAID`.
- `PATCH /api/batches/[batchId]/start` sets `IN_PROGRESS` after payment gates
  pass.
- The Ops UI dispatch flow posts mandatory dispatch metadata first, then calls
  batch completion. The completion API itself updates `COMPLETED` and evaluates
  whether the parent order can be closed.

## Happy path

1. **Buyer creates order** with product, quantity, and delivery location.
   - API: `POST /api/orders`
   - Credit and overdue policy is checked through `canOrgPlaceNewOrder`.
   - No batches are created at this step.
2. **Ops accepts order**.
   - API: `POST /api/orders/[orderId]/accept`
   - Only `PENDING_APPROVAL` orders can be accepted.
3. **Ops creates one or more batches**.
   - API: `POST /api/orders/[orderId]/batches`
   - Batch quantity must be greater than zero and cannot exceed the remaining
     requested quantity.
   - Credit and overdue policy is checked again before creating the batch.
   - The handler auto-generates invoice records and sets the batch to
     `INVOICED`.
4. **Buyer uploads payment proof**.
   - API: `POST /api/payments`
   - Payment amount must exactly equal the invoice's remaining amount. Partial
     or excess payments are rejected.
5. **Finance verifies payment**.
   - API: `POST /api/payments/[paymentId]/verify`
   - Approved payments set `verified=true` and `verifiedAt`.
   - For batch invoices, approval moves the batch to `PAYMENT_APPROVED` when
     the relevant invoice gate is satisfied.
6. **Ops starts processing**.
   - API: `PATCH /api/batches/[batchId]/start`
   - The handler requires verified payment before setting `IN_PROGRESS`.
7. **Ops dispatches and completes the batch**.
   - API: `POST /api/ops/dispatch`, then
     `PATCH /api/batches/[batchId]/complete`
   - Dispatch image URL is required by the dispatch API.
   - Dispatch records `dispatchedAt`, `leftFromSiteAt`, committed/supplied MT,
     and optional freight fields.
8. **Order closure is evaluated**.
   - The final completed batch returns `orderCompleted=true` only when every
     batch is complete and total batch quantity covers the requested order
     quantity.

## Invoice creation rules

Batch creation calculates transaction value as:

```text
batch.quantityMT * product.pricePMT
```

GST is calculated with `calculateGST` using buyer state, seller site state, and
the configured GST rate in the handler.

| Organization policy | Invoices created at batch creation | Notes |
| --- | --- | --- |
| `defaultPaymentMode = ADVANCE_BALANCE` and `0 < advancePercent < 100` | One `ADVANCE` invoice and one linked `BALANCE` invoice | The advance and balance portions each get their own GST calculation. |
| Any other payment mode, including `NET_TERMS`, `PAY_BEFORE_DISPATCH`, or `STANDARD` | One `STANDARD` invoice | `PAY_BEFORE_DISPATCH` sets `dueDateOverride` on the standard invoice to the batch delivery date, or seven days from creation when delivery date is absent. |

Payment term selection:

- Valid terms are `NET_15`, `NET_30`, `NET_60`, and `NET_90`.
- Batch auto-invoicing uses the organization's `defaultPaymentTerm` when valid;
  otherwise it falls back to `NET_30`.
- Manual Finance invoice creation also accepts those four terms and prevents a
  second invoice for a batch that already has one.

## Payment gates

| Batch invoice shape | Requirement before `PATCH /api/batches/[batchId]/start` |
| --- | --- |
| Has one or more `ADVANCE` invoices | Verified payments across advance invoices must cover the total advance amount. |
| No `ADVANCE` invoices | At least one invoice on the batch must have a verified payment. |

Finance verification behavior:

- Approving an `ADVANCE` payment sets the batch to `PAYMENT_APPROVED` only when
  verified advance payments cover the full advance invoice amount.
- Approving a non-advance payment for a batch invoice sets the batch to
  `PAYMENT_APPROVED`.
- Rejecting a payment sets `verified=false` and clears `verifiedAt`; it does
  not roll back a batch status that was already advanced.

## Credit and overdue gates

`canOrgPlaceNewOrder` blocks new buyer order creation and Ops batch creation
when either rule applies:

- `blockNewOrdersIfOverdue` is enabled for the organization and the buyer has
  overdue non-security-deposit invoices with outstanding balance.
- `creditLimit` is greater than zero and outstanding non-security-deposit
  invoice balance exceeds the limit.

Due dates use `Invoice.dueDateOverride` when present; otherwise they are derived
from `createdAt + paymentTerm`.

## Dispatch timeline

`GET /api/ops/dispatch-timeline` returns recent batches, a single order's
batches, or a single batch depending on query parameters.

Timeline events are derived from persisted fields:

- `BATCH_CREATED` from `OrderBatch.createdAt`
- `LEFT_SITE` from `leftFromSiteAt`
- `DISPATCHED` from `dispatchedAt` and `dispatchImageUrl`
- `SCHEDULED_DELIVERY` from `deliveryAt`
- `INVOICED` from the first invoice `createdAt`

Performance metrics include days from batch creation to scheduled delivery,
whether the batch left site on or before the scheduled delivery date, and transit
days from `leftFromSiteAt` to `deliveryAt`.

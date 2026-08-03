# RBAC policy (internal)

This app uses role-based access control enforced on API routes via
`requireAuth` + `requireRole`. Role gates answer "who can call this route";
buyer organization scoping answers "which records can this buyer see or mutate".

## Source of truth

| Concern | Codepath |
| --- | --- |
| Role enum and `User.orgId` | `prisma/schema.prisma` |
| Session lookup and cookie slots | `lib/session.js` |
| Request authentication and `x-request-id` | `lib/requireAuth.js` |
| Role allow-list wrapper | `lib/requireRole.js` |
| Shared invoice ownership check | `lib/invoiceAccess.js` |
| Buyer order scoping | `pages/api/orders/index.js`, `pages/api/orders/[orderId]/index.js` |
| Buyer invoice scoping | `pages/api/invoices/index.js`, `pages/api/invoices/[id]/index.js` |
| Buyer payment proof and payment create | `pages/api/uploads/payment-proof.js`, `pages/api/payments.js` |
| PDF ownership checks | `pages/api/invoices/[id]/pdf.js`, `pages/api/batches/[batchId]/challan.js` |

## Session and request contract

- `requireAuth` loads `req.session` from a DB-backed session token and rejects
  missing or expired sessions with `401`.
- The session payload exposes `userId`, `role`, `orgId`, and the full `user`.
  Buyer scoping depends on `session.orgId`; buyer users without an org cannot
  access org-scoped buyer records.
- Sessions are stored in one of four cookie slots:
  `cienergy_session_1` through `cienergy_session_4`.
- The active slot is selected by the `X-Session-Slot` request header. The web app
  stores the tab's slot in `sessionStorage` and patches `fetch` to send the
  header, which allows QA to test multiple roles in parallel tabs.
- Sessions expire after 30 days max age and after 15 minutes of inactivity.
- `requireAuth` sets `req.requestId` and response header `x-request-id` from an
  incoming request/correlation/trace header or generates a new UUID.

## Roles

- **ADMIN**: users, organizations, org policy fields, sites/products, security
  deposit invoices, dashboards, and cross-org operational visibility.
- **OPS**: order acceptance/rejection, batch create/start/dispatch/complete,
  delivery challans, dispatch timelines, inventory, and ops dashboards.
- **FINANCE**: invoice views, IRN updates, payment verification/history,
  receivables/aging, finance dashboards, credit notes, refunds, reports, and
  finance exports.
- **BUYER**: create orders, view own organization orders/invoices, upload payment
  proof, submit payments, download allowed invoice PDFs/challans, and buyer
  dashboards.

## Entity scoping rules

| Entity or flow | BUYER scope | Non-buyer scope |
| --- | --- | --- |
| Orders | Must match `Order.orgId === session.orgId`. List routes filter to the buyer org; detail routes check ownership after loading. | Allowed by route role gate. Ops/Admin can manage order workflow; Finance can read selected order views. |
| Batch-linked invoices | Owner is `Invoice.batch.order.orgId`. Use `buyerCanAccessInvoice` when the invoice is loaded with `batch.order`. | Admin/Finance can access through finance/invoice routes; Ops access is limited to operational batch/challan routes. |
| Standalone invoices | Owner is `Invoice.orgId`. This is used for `SECURITY_DEPOSIT` invoices where `batchId` is null. | Admin creates security deposit invoices; Finance/Admin can view and manage invoice/payment workflows. |
| Payment proof uploads | Buyer must pass the invoice ownership check before the file is uploaded to the `payment-proof` bucket. | Not available; upload route is buyer-only. |
| Payment creation | Buyer must pass the invoice ownership check and pay exactly the remaining invoice amount. | Verification/rejection is handled by Finance/Admin on payment-specific routes. |
| Delivery challan PDF | Buyer can download only when `OrderBatch.order.orgId === session.orgId`. | Ops/Admin/Finance can download by role gate. |

Non-buyer roles are generally cross-org within their role gate. If a non-buyer
route needs narrower visibility, add an explicit filter in the handler instead
of relying on `requireRole`.

## Sensitive route matrix

| Route | Methods | Roles | Scoping mechanism |
| --- | --- | --- | --- |
| `/api/orders` | `GET` | BUYER, OPS, ADMIN | BUYER list filters to `session.orgId`; OPS/ADMIN see all. |
| `/api/orders` | `POST` | BUYER | Creates with `orgId: session.orgId`; credit/overdue gate runs for that org. |
| `/api/orders/[orderId]` | `GET` | ADMIN, OPS, FINANCE, BUYER | BUYER detail rejects when `order.orgId !== session.orgId`. |
| `/api/orders/[orderId]` | `PATCH` | ADMIN, OPS | Handler enforces method-specific role before status update. |
| `/api/orders/[orderId]/batches` | `POST` | ADMIN, OPS | Creates batches only for accepted orders; runs credit/overdue gate for the order org. |
| `/api/orders/batch` | `POST` | ADMIN, OPS | Legacy batch-create route. Prefer `/api/orders/[orderId]/batches`; keep auth on this route while it exists. |
| `/api/invoices` | `GET` | ADMIN, FINANCE, BUYER | BUYER filter includes batch-linked invoices for `session.orgId` and standalone invoices with `Invoice.orgId`. |
| `/api/invoices/[id]` | `GET` | ADMIN, FINANCE, BUYER | Uses `buyerCanAccessInvoice` for BUYER ownership. |
| `/api/invoices/[id]` | `PATCH` | ADMIN, FINANCE | Method-specific role check; currently updates IRN fields. |
| `/api/invoices/[id]/pdf` | `GET` | Authenticated users | Inline BUYER check mirrors `getInvoiceOrgId`: batch order org first, then `Invoice.orgId`. |
| `/api/uploads/payment-proof` | `POST` | BUYER | Uses `buyerCanAccessInvoice` before Supabase upload. |
| `/api/payments` | `POST` | BUYER | Uses `buyerCanAccessInvoice`; rejects partial/excess payments. |
| `/api/payments/[paymentId]/verify` | `POST` | ADMIN, FINANCE | Finance/Admin verification path; may advance batch payment state. |
| `/api/batches/[batchId]/challan` | `GET` | OPS, ADMIN, FINANCE, BUYER | Inline BUYER check requires batch order org to match `session.orgId`. |
| `/api/admin/organizations/[id]/security-deposit-invoice` | `POST` | ADMIN | Creates standalone `SECURITY_DEPOSIT` invoice with `orgId` and no batch. |

## API enforcement pattern

Use the route wrappers in this order:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

When one route supports methods with different policies, keep the auth wrapper
outside and branch inside a method-aware role wrapper:

```js
export default requireAuth(async function withMethodRoles(req, res) {
  if (req.method === "PATCH") {
    return requireRole(["ADMIN", "FINANCE"], handler)(req, res);
  }
  return requireRole(["ADMIN", "FINANCE", "BUYER"], handler)(req, res);
});
```

## Developer checklist

- Always include `requireAuth` before reading `req.session`.
- Prefer `buyerCanAccessInvoice(session, invoice)` for invoice detail, payment,
  and upload routes. Load `batch.order` when checking batch-linked invoices.
- For standalone invoice flows, make sure `Invoice.orgId` is selected or included;
  security deposit invoices do not have a batch.
- For PDF or streaming routes that do not use the helper, mirror
  `getInvoiceOrgId`: resolve `invoice.batch?.order?.orgId` first, then
  `invoice.orgId`.
- Any new BUYER list route should filter at the database query, not load all
  records and filter in memory.
- Any new BUYER detail/mutation route should return `403` when the record exists
  but belongs to another organization.


# RBAC policy (internal)

This page documents how API authentication, role gates, and buyer organization
scoping are implemented. Treat it as the engineering reference when changing
route access, invoice visibility, payment proof uploads, or role-specific
workflows.

## Source of truth

| Concern | Codepath |
| --- | --- |
| User roles and org/session fields | `prisma/schema.prisma` |
| Session cookie creation, lookup, expiry | `lib/session.js` |
| Auth wrapper and request id propagation | `lib/requireAuth.js` |
| Role wrapper | `lib/requireRole.js` |
| Buyer invoice/org scoping helper | `lib/invoiceAccess.js` |
| Login/logout/current user | `pages/api/auth/login.js`, `pages/api/auth/logout.js`, `pages/api/auth/me.js` |
| Buyer payment creation and proof upload | `pages/api/payments.js`, `pages/api/uploads/payment-proof.js` |
| Invoice list/detail/PDF access | `pages/api/invoices/index.js`, `pages/api/invoices/[id]/index.js`, `pages/api/invoices/[id]/pdf.js` |
| Security deposit invoice ownership | `pages/api/admin/organizations/[id]/security-deposit-invoice.js` |

## Auth/session contract

- `POST /api/auth/login` is public. It checks active users, verifies the
  password, creates a DB-backed session, sets an HTTP-only cookie, and logs a
  `user/login` audit event.
- Session cookies use slots `cienergy_session_1` through
  `cienergy_session_4`. The client selects the slot with `x-session-slot`;
  missing or invalid slots default to slot `1`.
- Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Sessions
  have a 30-day max age and a 15-minute inactivity timeout.
- `requireAuth(handler)` resolves the session, deletes expired/inactive
  sessions, rejects unauthenticated requests with `401`, attaches
  `req.session = { userId, role, orgId, user }`, and sets an `x-request-id`.
- `requireRole(roleOrRoles, handler)` must run after `requireAuth`. It accepts a
  single role or an array and rejects disallowed roles with `403`.
- `POST /api/auth/logout` is public by design; it destroys the current cookie
  slot when present and redirects to `/login`.

## Roles

| Role | Intended access |
| --- | --- |
| `ADMIN` | User/org policy administration, sites/products, security deposits, admin dashboards, and selected Ops/Finance workflows. |
| `OPS` | Order acceptance/rejection, batch create/start/dispatch/complete, dispatch timeline, inventory, and Ops dashboards. |
| `FINANCE` | Invoices, payment verification/history, receivables/aging, credit notes/refunds, sales reports, and finance dashboards. |
| `BUYER` | Buyer catalog/dashboard, own organization orders, own organization invoices including security deposit invoices, and payment proof submission. |

## Route role matrix

The table lists the current API gates. Method-specific exceptions are called out
where a single route uses different role checks by method.

| Area | Routes | Gate and scope |
| --- | --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout` | Public; login creates a session, logout clears the selected session slot if present. |
| Auth | `/api/auth/me` | Authenticated only; no role gate or method-specific handler check. |
| Buyer dashboards/catalog | `/api/buyer/*` | `BUYER`; buyer order and repeat-order routes scope to `session.orgId`. |
| Shared catalog | `/api/catalog` | Authenticated only; no role gate or method-specific handler check. Returns active products and positive inventory sites. |
| Orders | `GET /api/orders` | `BUYER`, `OPS`, `ADMIN`; buyers see only `session.orgId`, Ops/Admin see all. |
| Orders | `POST /api/orders` | Route gate allows `BUYER`, `OPS`, `ADMIN`, but the handler only creates buyer orders from `session.orgId`; non-buyers are rejected for creation. |
| Order detail | `/api/orders/[orderId]` | `ADMIN`, `OPS`, `FINANCE`, `BUYER`; buyers are denied when the order org differs. `PATCH` is restricted inside the handler to `OPS`/`ADMIN`. |
| Ops order actions | `/api/orders/[orderId]/accept`, `/reject`, `/batches`, `/api/orders/batch` | `ADMIN`, `OPS`. |
| Batches | `/api/batches/[batchId]/start`, `/complete` | `ADMIN`, `OPS`. |
| Batches | `/api/batches/[batchId]` | `OPS`, `ADMIN`, `FINANCE`. |
| Challans | `/api/batches/[batchId]/challan` | `OPS`, `ADMIN`, `FINANCE`, `BUYER`; buyer access is org-scoped. |
| Invoices | `GET /api/invoices` | `ADMIN`, `FINANCE`, `BUYER`; buyers see invoices whose batch order org or direct `invoice.orgId` equals `session.orgId`. |
| Invoice detail | `GET /api/invoices/[id]` | `ADMIN`, `FINANCE`, `BUYER`; buyers must pass `buyerCanAccessInvoice`. |
| Invoice detail | `PATCH /api/invoices/[id]` | `ADMIN`, `FINANCE`; currently used for IRN placeholder fields. |
| Invoice PDF | `GET /api/invoices/[id]/pdf` | Authenticated only; buyers are org-scoped, any non-buyer authenticated role can download. |
| Invoice create | `POST /api/invoices/create` | `FINANCE`. |
| Payments | `POST /api/payments` | `BUYER`; invoice ownership is checked before creating an unverified payment. |
| Payment verification | `POST /api/payments/[paymentId]/verify` | `ADMIN`, `FINANCE`. |
| Payment proof upload | `POST /api/uploads/payment-proof` | `BUYER`; invoice ownership is checked before uploading to the `payment-proof` bucket. |
| Dispatch image upload | `POST /api/uploads/dispatch-image` | `OPS`, `ADMIN`; uploads to the `dispatch-images` bucket. |
| Ops APIs | `/api/ops/orders` | `OPS`, `FINANCE`, `ADMIN`. |
| Ops APIs | `/api/ops/inventory`, `/dashboard`, `/bi-dashboard` | `OPS`. |
| Ops APIs | `/api/ops/dispatch` | `OPS`, `ADMIN`. |
| Ops APIs | `/api/ops/dispatch-timeline` | `OPS`, `ADMIN`, `FINANCE`. |
| Admin APIs | Most `/api/admin/*` | `ADMIN`. |
| Admin exceptions | `GET /api/admin/sites` | `ADMIN`, `OPS`, `BUYER`; `POST` is `ADMIN`. |
| Admin exceptions | `GET /api/admin/products` | `ADMIN`, `OPS`; `POST` is `ADMIN`. |
| Admin exceptions | `/api/admin/contracts`, `/api/admin/activity-log` | `ADMIN`, `FINANCE`. |
| Admin exceptions | `/api/admin/inventory/init` | `ADMIN`, `OPS`. |
| Finance APIs | `/api/finance/dashboard`, `/bi-dashboard`, `/invoices/download`, `/receivables`, `/payments`, `/payments/history` | `FINANCE`. |
| Finance APIs | `/api/finance/credit-notes`, `/dunning-reminder`, `/refunds`, `/refunds/[refundId]`, `/sales-report` | `ADMIN`, `FINANCE`. |
| Finance export | `/api/finance/orders/export` | `FINANCE`, `ADMIN`, `OPS`. |

## Buyer organization and invoice scoping

Buyer routes must never rely on role gates alone. They must also scope data to
`req.session.orgId`.

### Orders

- Buyer order creation sets `orgId` from `session.orgId`; buyers cannot submit
  an arbitrary organization id.
- Buyer order listing and detail routes filter or reject by order `orgId`.
- Non-buyer roles may read across organizations where the route role gate allows
  it.

### Invoices and payments

`lib/invoiceAccess.js` centralizes invoice ownership:

```js
const ownerOrgId = invoice.batch?.order?.orgId ?? invoice.orgId;
```

- Batch-linked invoices are owned by the batch order's organization.
- Standalone invoices, such as security deposits, are owned by `invoice.orgId`.
- `buyerCanAccessInvoice(session, invoice)` only restricts `BUYER` sessions.
  For non-buyers it returns `true`, so routes must still apply the correct
  `requireRole` gate before using it.

The helper is currently used by:

- `GET /api/invoices/[id]`
- `POST /api/payments`
- `POST /api/uploads/payment-proof`

Invoice list and PDF routes implement the same buyer-org rule inline. Keep these
paths aligned if invoice ownership changes.

## Payment proof and security deposit constraints

- Buyers can create payments only through `POST /api/payments`.
- The payment amount must exactly equal the invoice's remaining amount; partial
  and excess payments are rejected.
- Payment proof uploads are buyer-only and require the invoice to belong to the
  buyer's org before writing to Supabase Storage.
- Admin-created security deposit invoices use `batchId = null`,
  `orgId = <buyer org>`, `invoiceType = "SECURITY_DEPOSIT"`, and
  `paymentTerm = "NET_15"`. Because invoice scoping falls back to
  `invoice.orgId`, buyers can list, view, download, and pay their own security
  deposit invoices.

## Known exceptions and caveats

- `GET /api/invoices/[id]/pdf` has no `requireRole`; it allows any
  authenticated non-buyer role to download any invoice PDF, while buyers remain
  org-scoped.
- `/api/catalog` is authenticated-only with no role gate and no method-specific
  handler check.
- Prototype endpoints `GET /api/products`, `GET /api/products/stock`, and
  `GET /api/production/batches` currently have no `requireAuth` wrapper and
  return product or dummy stock/batch data.
- Some finance reports aggregate batch-linked invoices and may not include
  standalone security deposit invoices. Check each report query before assuming
  security deposits appear in finance totals.

## API enforcement pattern

Default route shape:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

Use a method-aware wrapper when roles differ by method:

```js
export default requireAuth(async function route(req, res) {
  if (req.method === "GET") {
    return requireRole(["ADMIN", "OPS"], handler)(req, res);
  }
  if (req.method === "POST") {
    return requireRole("ADMIN", handler)(req, res);
  }
  return res.status(405).end();
});
```

When adding buyer access:

1. Add `requireAuth` and the narrowest practical `requireRole` gate.
2. Filter list queries by `session.orgId`.
3. Re-check ownership on detail/action routes before returning or mutating data.
4. For invoices, prefer `buyerCanAccessInvoice` and include
   `batch.order.orgId` or `orgId` in the query shape needed by the helper.


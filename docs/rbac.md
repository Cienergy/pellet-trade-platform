# RBAC policy (internal)

This page documents the authentication, role gates, and buyer organization
scoping rules implemented by the API handlers. Treat it as the engineering
reference when adding routes, changing user roles, or exposing order, invoice,
payment, or dispatch data.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Role enum, active users, org membership, sessions | `prisma/schema.prisma` |
| Login credential check and session creation | `pages/api/auth/login.js`, `lib/session.js` |
| Session lookup, timeout, and request id propagation | `lib/session.js`, `lib/requireAuth.js` |
| Role middleware | `lib/requireRole.js` |
| Buyer invoice ownership helper | `lib/invoiceAccess.js` |
| Client session slot forwarding | `pages/_app.js`, `pages/login.js` |
| Post-login role redirects | `pages/login.js`, `pages/dashboard.js`, `lib/roleRedirect.js` |

## Roles

- **ADMIN**: admin dashboards, users, organizations, buyer policy fields,
  security deposit invoices, sites/products writes, contracts, activity logs,
  and Ops/Finance workflow overrides where explicitly allowed.
- **OPS**: order acceptance/rejection, batch creation/start/dispatch/complete,
  dispatch timeline, inventory workflows, and Ops dashboards.
- **FINANCE**: invoice review/download, payment verification/history,
  receivables/aging, sales reports, credit notes, dunning reminders, refunds,
  finance dashboards, and read access to selected order/batch surfaces.
- **BUYER**: buyer catalog, own-organization order creation/history/repeat,
  own-organization invoices, payment proof upload, invoice PDFs, and buyer
  dashboards.

## Session model

Sessions are stored in the `Session` table and referenced by an HttpOnly cookie
named `cienergy_session_<slot>`.

- Valid slots are `1` through `4`; missing or invalid `X-Session-Slot` defaults
  to slot `1`.
- `pages/_app.js` patches browser `fetch` to send `X-Session-Slot` from
  `sessionStorage`, and `/login?slot=2` through `/login?slot=4` can be used for
  demo multi-session testing.
- Session cookies are `Path=/`, `HttpOnly`, `SameSite=Lax`, and `Secure` only in
  production.
- `getSession` rejects expired sessions, inactive users, and sessions idle for
  more than 15 minutes. Accepted sessions refresh `lastActivityAt`.
- `requireAuth` attaches `req.session`, sets `x-request-id`, and returns `401`
  when the selected slot has no valid session.
- `requireRole` returns `403` when `req.session.role` is not in the allowed role
  list.

## Public and prototype endpoints

Most business APIs must go through `requireAuth`. Current exceptions are:

| Endpoint | Auth behavior | Notes |
| --- | --- | --- |
| `POST /api/auth/login` | Public | Creates one session in the requested slot after checking active user credentials. |
| `POST /api/auth/logout` | Public | Clears the selected slot if a cookie exists; does not require a valid session. |
| `GET /api/products` | Public | Legacy Supabase/prototype product list with static fallback. Not the role-gated Prisma catalog. |
| `GET /api/products/stock` | Public | Prototype stock response from hard-coded data. |
| `GET /api/production/batches` | Public | Prototype batch response from hard-coded data. |

`pages/api/_supabase.js` is a helper module under `pages/api`, not a request
handler. Do not treat it as an authenticated API boundary.

## Route families

| Area | Routes | Roles | Scoping and constraints |
| --- | --- | --- | --- |
| Auth profile | `GET /api/auth/me` | Any authenticated role | Returns the current session user id, email, role, and org id. |
| Shared Prisma catalog | `GET /api/catalog` | Any authenticated role | Returns active products and sites. |
| Buyer catalog and analytics | `/api/buyer/catalog`, `/api/buyer/consumption-patterns`, `/api/buyer/bi-dashboard` | BUYER | Queries are scoped to `session.orgId` when they read orders, batches, invoices, or payments. |
| Buyer orders | `/api/buyer/orders`, `/api/buyer/orders/[orderId]/repeat` | BUYER | Reads and repeat-order creation are scoped to `session.orgId`; repeat creation runs the same credit/overdue gate as new order creation. |
| Orders | `/api/orders`, `/api/orders/[orderId]` | BUYER, OPS, ADMIN; FINANCE can read a single order | `POST /api/orders` additionally requires `session.role === "BUYER"` and creates orders for `session.orgId`. Buyer reads must match the order org. `PATCH /api/orders/[orderId]` is manually limited to OPS/ADMIN. |
| Order decisions and batches | `/api/orders/[orderId]/accept`, `/reject`, `/batches`, `/api/orders/batch` | OPS, ADMIN | Batch creation is allowed only after order acceptance and re-checks credit/overdue policy for the buyer org. |
| Batch operations | `/api/batches/[batchId]`, `/start`, `/complete`, `/challan` | OPS/ADMIN for mutations; FINANCE read on batch detail; BUYER allowed only for challan | Buyer challan download is allowed only when the batch order org matches `session.orgId`. |
| Ops workflow | `/api/ops/orders`, `/api/ops/dispatch-timeline`, `/api/ops/dispatch`, `/api/ops/inventory`, `/api/ops/dashboard`, `/api/ops/bi-dashboard` | OPS/ADMIN/FINANCE for order and timeline reads; OPS/ADMIN for dispatch; OPS for inventory; OPS for Ops dashboards | Dispatch requires an uploaded dispatch image URL before material can be marked dispatched. |
| Invoices | `/api/invoices`, `/api/invoices/[id]`, `/api/invoices/[id]/pdf`, `/api/invoices/create`, `/api/finance/invoices/download` | ADMIN, FINANCE, BUYER on list/detail reads; FINANCE for creation and bulk download; ADMIN/FINANCE for IRN updates; PDF is any authenticated non-buyer plus scoped BUYER | Buyer invoice reads and PDFs must resolve to `session.orgId` through either batch order org or standalone invoice org. |
| Payments and uploads | `/api/payments`, `/api/uploads/payment-proof`, `/api/uploads/dispatch-image`, `/api/payments/[paymentId]/verify` | BUYER for payment proof/payment create; OPS/ADMIN for dispatch images; ADMIN/FINANCE for verification | Buyer payment creation and proof upload use `buyerCanAccessInvoice`; amount must match invoice remaining amount. Verification changes payment and batch state. |
| Finance | `/api/finance/*` | FINANCE unless route allows ADMIN or OPS | Examples: dashboard, receivables, payment review, payment history, and invoice CSV download are FINANCE; sales report, credit notes, refunds, and dunning reminders allow ADMIN/FINANCE; orders export allows FINANCE/ADMIN/OPS. |
| Admin | `/api/admin/*` | ADMIN unless route explicitly widens reads | Products `GET` allows ADMIN/OPS while `POST` is ADMIN. Sites `GET` allows ADMIN/OPS/BUYER while `POST` is ADMIN. Inventory init allows ADMIN/OPS. |

## Buyer organization scoping

BUYER access is always tied to `session.orgId`. When adding or changing buyer
routes, verify both the route role and the data predicate.

Required patterns:

```js
// Orders: direct org ownership.
if (session.role === "BUYER" && order.orgId !== session.orgId) {
  return res.status(403).json({ error: "Forbidden" });
}
```

```js
// Invoices: standalone invoices use invoice.orgId; batch invoices use order org.
if (!buyerCanAccessInvoice(session, invoice)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

Important invoice paths:

- Batch invoices resolve ownership through `invoice.batch.order.orgId`.
- Standalone invoices, such as security deposit invoices, resolve ownership
  through `invoice.orgId`.
- List queries for buyers must include both shapes:
  `{ batch: { order: { orgId: session.orgId } } }` or
  `{ orgId: session.orgId }`.

## Method-specific gates

Some files intentionally cannot use a single static role wrapper because `GET`
and mutation methods have different policies.

Examples:

- `pages/api/admin/products.js`
  - `GET`: ADMIN, OPS
  - `POST`: ADMIN
- `pages/api/admin/sites.js`
  - `GET`: ADMIN, OPS, BUYER
  - `POST`: ADMIN
- `pages/api/invoices/[id]/index.js`
  - `GET`: ADMIN, FINANCE, BUYER with buyer ownership check
  - `PATCH`: ADMIN, FINANCE only
- `pages/api/orders/[orderId]/index.js`
  - `GET`: ADMIN, OPS, FINANCE, BUYER with buyer ownership check
  - `PATCH`: OPS, ADMIN only

Use an outer `requireAuth` wrapper, then choose the per-method `requireRole`
or manual role check inside the authenticated handler.

## Change checklist

When adding or modifying an API route:

1. Wrap business endpoints with `requireAuth`; use `requireRole` unless the
   file needs method-specific gates.
2. Keep public endpoints limited to login/logout or intentional prototype
   surfaces, and document any new exception here.
3. For BUYER reads or writes, prove the entity belongs to `session.orgId`.
4. For invoices, use `buyerCanAccessInvoice` or match both batch-linked and
   standalone invoice ownership.
5. For state-changing routes, keep audit logging aligned with nearby handlers
   and pass `req` when request id context is useful.
6. Re-check route families above after role changes so dashboards, CSV/PDF
   downloads, uploads, and API handlers stay consistent.


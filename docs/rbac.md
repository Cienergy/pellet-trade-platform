# RBAC policy (internal)

This page documents the authentication, route-level role gates, and buyer
organization scoping rules implemented in the API layer. Treat it as the
engineering reference when adding API routes or changing access policy.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Role enum and session persistence | `prisma/schema.prisma` |
| Login and session creation | `pages/api/auth/login.js`, `lib/session.js` |
| Auth wrapper and request IDs | `lib/requireAuth.js` |
| Route role wrapper | `lib/requireRole.js` |
| Buyer invoice org checks | `lib/invoiceAccess.js` |
| Buyer order scoping | `pages/api/orders/index.js`, `pages/api/orders/[orderId]/index.js`, `pages/api/buyer/*` |
| Invoice list/detail/PDF scoping | `pages/api/invoices/index.js`, `pages/api/invoices/[id]/index.js`, `pages/api/invoices/[id]/pdf.js` |
| Payment proof and payment creation gates | `pages/api/uploads/payment-proof.js`, `pages/api/payments.js` |

## Roles

The `UserRole` enum has four roles:

- **ADMIN**: user, organization policy, site/product, contract, security deposit,
  and admin dashboard workflows.
- **OPS**: order acceptance/rejection, batch create/start/dispatch/complete,
  inventory, dispatch timeline, and ops dashboard workflows.
- **FINANCE**: invoice, payment verification/history, receivables, reports,
  activity log, and finance dashboard workflows.
- **BUYER**: create and view orders for `session.orgId`, view invoices for
  `session.orgId`, upload payment proof, create payments, and use buyer
  dashboards.

## Session model

Login (`POST /api/auth/login`) verifies an active user with `bcryptjs`, then
creates a database-backed session and sets an HTTP-only cookie:

```text
cienergy_session_<slot>
```

Constraints:

- Valid slots are `1`, `2`, `3`, and `4`; invalid or missing values default to
  slot `1`.
- API requests select a slot with the `x-session-slot` header; missing or invalid
  headers also default to slot `1`.
- Session cookies use `Path=/`, `HttpOnly`, `SameSite=Lax`, a 30-day `Max-Age`,
  and `Secure` in production.
- `getSession` rejects missing cookies, deleted sessions, inactive users,
  sessions past `expiresAt`, and sessions idle for more than 15 minutes.
- Successful authenticated requests update `lastActivityAt`.
- `POST /api/auth/logout` destroys only the selected slot and redirects to
  `/login`.

`requireAuth` adds a request ID before enforcing the session:

- Incoming `x-request-id`, `x-correlation-id`, or `x-amzn-trace-id` is reused
  when present.
- Otherwise a new UUID is assigned to `req.requestId`.
- The response always includes the same value in `x-request-id`.
- Authenticated handlers receive `req.session = { userId, role, orgId, user }`.

## Route guard pattern

Use `requireAuth` before `requireRole`:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

For method-specific policy, wrap by method inside the authenticated export:

```js
export default requireAuth(async function (req, res) {
  if (req.method === "GET") {
    return requireRole(["ADMIN", "OPS"], handler)(req, res);
  }

  if (req.method === "POST") {
    return requireRole("ADMIN", handler)(req, res);
  }

  return res.status(405).end();
});
```

`requireRole` assumes `req.session` already exists. If used without
`requireAuth`, it returns `401`, but the normal route contract is auth first,
then role.

## Route access overview

These are the main API role gates as implemented today. Check source before
changing a route because several handlers apply additional method or entity
checks after the top-level role gate.

| Area | Routes | Roles / constraints |
| --- | --- | --- |
| Auth | `/api/auth/login` | Public `POST`; creates one selected session slot. |
| Auth | `/api/auth/me` | Any authenticated session. |
| Auth | `/api/auth/logout` | Public `POST`; deletes selected session cookie/token when present. |
| Buyer API | `/api/buyer/orders`, repeat order, catalog, BI, consumption patterns | `BUYER`; reads and writes use `session.orgId`. |
| Orders | `/api/orders` | `BUYER`, `OPS`, `ADMIN`; `POST` is additionally limited to `BUYER`; buyer `GET` filters to `session.orgId`. |
| Order detail | `/api/orders/[orderId]` | `ADMIN`, `OPS`, `FINANCE`, `BUYER`; buyers are blocked when `order.orgId !== session.orgId`; `PATCH` is additionally limited to `OPS` and `ADMIN`. |
| Order decisions and batches | accept, reject, batch create, batch start/complete | `ADMIN`, `OPS`. |
| Batch metadata | `/api/batches/[batchId]` margin and e-way bill PATCH | `OPS`, `ADMIN`, `FINANCE`. |
| Batch documents | `/api/batches/[batchId]/challan` | `OPS`, `ADMIN`, `FINANCE`, `BUYER`; buyers must match the batch order org. |
| Ops | dispatch, dispatch image upload | `OPS`, `ADMIN`. |
| Ops | ops dashboard, inventory, ops BI | `OPS`. |
| Ops | dispatch timeline | `OPS`, `ADMIN`, `FINANCE`. |
| Finance | payments queue/history, receivables, dashboard, BI | `FINANCE`. |
| Finance | payment verification, refunds, credit notes, dunning reminders | `ADMIN`, `FINANCE`. |
| Finance | sales report | `FINANCE`, `ADMIN`. |
| Finance | orders export | `FINANCE`, `ADMIN`, `OPS`. |
| Finance | invoice CSV download | `FINANCE`. |
| Admin | users, buyers, organizations, dashboard, security deposit invoice | `ADMIN`. |
| Admin | products | `GET`: `ADMIN`, `OPS`; `POST`: `ADMIN`. |
| Admin | sites | `GET`: `ADMIN`, `OPS`, `BUYER`; `POST`: `ADMIN`. |
| Admin | contracts and activity log | `ADMIN`, `FINANCE`. |
| Admin | inventory init | `ADMIN`, `OPS`. |
| Invoices | `/api/invoices` | `ADMIN`, `FINANCE`, `BUYER`; buyers see only batch-linked invoices for their org or standalone invoices with matching `orgId`. |
| Invoice detail | `/api/invoices/[id]` | `GET`: `ADMIN`, `FINANCE`, `BUYER`; buyers must pass `buyerCanAccessInvoice`; `PATCH`: `ADMIN`, `FINANCE`. |
| Invoice PDF | `/api/invoices/[id]/pdf` | Any authenticated role; buyers must match invoice org. |
| Payment proof/payment | `/api/uploads/payment-proof`, `/api/payments` | `BUYER`; invoice must pass `buyerCanAccessInvoice`. |
| Legacy receipt redirects | `/api/payments/[paymentId]/receipt`, `/api/invoices/receipts/[paymentId]` | `ADMIN`, `FINANCE`, `BUYER`; currently return `410 Gone`. |

## Buyer organization scoping

Role gates do not automatically enforce organization boundaries. Any route that
allows `BUYER` must scope data to `session.orgId` in the handler.

Implemented patterns:

- Buyer order list/create uses `where: { orgId: session.orgId }` and writes
  `orgId: session.orgId`.
- Buyer order detail loads the order, then returns `403` when
  `order.orgId !== session.orgId`.
- Buyer invoice list uses an `OR` filter:
  - batch-linked invoice: `invoice.batch.order.orgId === session.orgId`
  - standalone invoice, such as a security deposit: `invoice.orgId === session.orgId`
- Single invoice reads and payment-proof/payment creation use
  `buyerCanAccessInvoice(session, invoice)`.
- Delivery challan and invoice PDF endpoints repeat the buyer org check before
  streaming documents.

`buyerCanAccessInvoice` returns `true` for non-buyer sessions. Do not use it as
the only protection on routes that should exclude `OPS`, `FINANCE`, or `ADMIN`;
pair it with the route's intended `requireRole` gate.

## Invoice and payment access constraints

Buyer payment flows are intentionally narrow:

1. `POST /api/uploads/payment-proof`
   - Requires role `BUYER`.
   - Requires `invoiceId` and file upload.
   - Loads the invoice with `batch.order` and rejects cross-org buyers.
   - Uploads to the `payment-proof` Supabase bucket and returns `proofUrl`.
2. `POST /api/payments`
   - Requires role `BUYER`.
   - Requires `invoiceId`, `amount`, `mode`, and `proofUrl`.
   - Rejects cross-org buyers.
   - Accepts only the exact remaining amount after verified payments; partial
     and excess payments are rejected.
   - Creates the payment as `verified=false`; Finance/Admin verification happens
     through `/api/payments/[paymentId]/verify`.

Standalone security deposit invoices have `orgId` and no batch. Include
`invoice.orgId` in scoping checks for any new invoice route, otherwise buyers
will be blocked from their own security deposit invoices or may see data they
should not.

## Adding or changing API routes

Use this checklist for new protected handlers:

1. Decide the role gate per method, not just per file.
2. Wrap with `requireAuth` before `requireRole`.
3. If `BUYER` is allowed, add an explicit `session.orgId` constraint to every
   read, write, streamed file, and aggregate.
4. For invoice routes, include both ownership shapes:
   `invoice.batch.order.orgId` and standalone `invoice.orgId`.
5. Return `401` for missing/expired sessions, `403` for authenticated users that
   fail role or entity checks, and `405` for unsupported methods.
6. Pass `req` into `logAudit` on mutating routes when request ID/IP/user-agent
   context should be preserved.
7. Update this page and `docs/order-lifecycle.md` when access changes affect
   order, invoice, payment, or dispatch workflows.

## Known access caveats

- `ADMIN` does not automatically pass every Finance-only endpoint; some finance
  dashboard and payment history routes are currently `FINANCE` only.
- `/api/invoices/[id]/pdf` uses `requireAuth` plus a buyer org check, but no
  `requireRole`. This means authenticated non-buyer roles can fetch invoice PDFs
  regardless of their specific role.
- Legacy receipt endpoints are still role-gated, but they intentionally return
  `410 Gone` and should not be used for new payment workflows.


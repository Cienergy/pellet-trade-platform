# RBAC policy (internal)

This app uses cookie-backed sessions plus route-level role checks on API routes.
Use this page as the engineering reference when adding routes, changing buyer
scoping, or troubleshooting multi-role demo sessions.

## Source of truth

| Concern | Codepath |
| --- | --- |
| User roles and session records | `prisma/schema.prisma` |
| Session cookie creation, lookup, expiry, and logout | `lib/session.js` |
| Authentication wrapper and request IDs | `lib/requireAuth.js` |
| Role wrapper | `lib/requireRole.js` |
| Auth endpoints | `pages/api/auth/login.js`, `pages/api/auth/logout.js`, `pages/api/auth/me.js` |
| Browser session-slot forwarding | `pages/_app.js`, `pages/login.js` |
| Invoice buyer scoping helper | `lib/invoiceAccess.js` |

## Roles

- **ADMIN**: full access to users, org policies, sites/products, contracts,
  activity logs, dashboards, and admin-only mutation flows.
- **OPS**: order acceptance workflow, batch creation/start/dispatch/complete,
  inventory updates, ops dashboards, and operational exports where explicitly
  allowed.
- **FINANCE**: invoices, payment verification/history, receivables/aging, sales
  reports, finance dashboards, and credit-note/refund workflows.
- **BUYER**: create/view own organization orders, view/pay own organization
  invoices, access own buyer dashboards, and repeat own orders.

## Session model

Login creates a `Session` row and writes an HTTP-only cookie named
`cienergy_session_<slot>`.

- Valid slots are `1`, `2`, `3`, and `4`; invalid or missing slots fall back to
  slot `1`.
- `POST /api/auth/login` accepts `{ email, password, slot }`, validates the
  active user, creates a session for the selected slot, logs the login audit
  event, and returns `{ id, email, role }`.
- `GET /api/auth/me` requires a valid session and returns `{ id, email, role,
  orgId }`.
- `POST /api/auth/logout` deletes only the session token for the selected slot
  and clears that slot cookie.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in
  production.

Session expiry has two layers:

| Expiry | Behavior |
| --- | --- |
| 30-day max age | `expiresAt` is set at login; expired rows are deleted during session lookup. |
| 15-minute inactivity timeout | `lastActivityAt` is refreshed on every authenticated request; inactive rows are deleted during session lookup. |

## Multi-session slots

The UI supports demoing multiple roles in different tabs by carrying a session
slot in browser state.

1. Visiting `/login?slot=2`, `/login?slot=3`, or `/login?slot=4` stores the slot
   in `sessionStorage`; absent slots default to `1`.
2. `pages/_app.js` patches browser `fetch` to send `X-Session-Slot` on API
   requests.
3. `lib/session.js` reads `X-Session-Slot` to choose which cookie
   (`cienergy_session_1` through `cienergy_session_4`) should authenticate the
   request.

Use `fetch(..., { credentials: "include" })` or `credentials: "same-origin"`
for browser calls that must include the session cookie. Client-side logout
should use `components/LogoutButton.js` so the patched fetch sends the active
slot header before redirecting.

## API enforcement pattern

Authenticated routes should be wrapped with `requireAuth`, then with
`requireRole` when the endpoint is role-limited:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

When a single route supports multiple methods with different roles, branch by
method after authentication and invoke `requireRole` per method:

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

`requireAuth` attaches `req.session` and `req.requestId`, and returns `401` when
the session is missing, expired, inactive, or belongs to an inactive user.
`requireRole` returns `403` when the authenticated role is not in the allowed
set.

`req.requestId` is taken from `X-Request-Id`, `X-Correlation-Id`, or
`X-Amzn-Trace-Id` when one of those request headers is present; otherwise
`requireAuth` generates a UUID. The selected value is returned on the response
as `x-request-id`.

## Entity scoping rules

- **Buyer organization scoping**: any BUYER access to orders, invoices, payment
  creation, receipts, or buyer analytics must be restricted to `session.orgId`.
- **Invoices can be batch-linked or standalone**: batch invoices resolve the
  owner through `invoice.batch.order.orgId`; standalone invoices such as
  `SECURITY_DEPOSIT` resolve through `invoice.orgId`.
- Use `buyerCanAccessInvoice(session, invoice)` from `lib/invoiceAccess.js` for
  invoice detail, payment, and receipt routes so both invoice shapes stay
  covered.
- **Non-buyer roles** may access across organizations only when the route role
  gate allows it, such as finance receivables or admin dashboards.

## Operational notes and pitfalls

- If an authenticated browser request unexpectedly returns `401`, check that the
  request includes credentials and that the active tab is sending the expected
  `X-Session-Slot` header.
- If logout removes the wrong role in a multi-role demo, confirm the UI is using
  the client-side `LogoutButton`; a plain form post may omit the slot header and
  default to slot `1`.
- Session validation updates `lastActivityAt` on each authenticated request. Any
  code that calls `getSession` in a tight loop will write to the database each
  time.
- New BUYER-facing invoice routes should include `batch.order` when batch-linked
  ownership is possible and must not select away `Invoice.orgId`; otherwise
  security-deposit invoices or batch invoices may be scoped incorrectly.
- Public or unauthenticated endpoints should be rare and deliberate. Most
  business APIs in `pages/api/**` are expected to use `requireAuth`.


# RBAC policy (internal)

This app uses role-based access control enforced on API routes via `requireAuth` + `requireRole`.

## Session model

Sessions are database-backed records in `Session` and are selected by numbered
cookie slots:

- `POST /api/auth/login` accepts an optional `slot` value from 1 to 4. Invalid
  or missing values use slot 1.
- Each slot writes an `HttpOnly` cookie named `cienergy_session_1` through
  `cienergy_session_4`.
- `pages/_app.js` stores the selected slot in `sessionStorage` from the
  `?slot=` query string and patches `window.fetch` to send `X-Session-Slot`.
- `lib/session.js` reads that header, loads the matching cookie token, and
  returns `userId`, `role`, `orgId`, and the user record on `req.session`.
- Sessions expire after 30 days maximum and after 15 minutes of inactivity.
  Expired or inactive sessions are deleted during lookup.
- Logout deletes only the selected slot's session token. Use the
  `LogoutButton` component for client navigation so the `X-Session-Slot` header
  is included.

## Roles

- **ADMIN**: full access (users, org policies, sites/products, dashboards).
- **OPS**: order acceptance workflow, batch creation/start/dispatch/complete, ops dashboards.
- **FINANCE**: invoices, payments verification/history, receivables/aging, finance dashboards.
- **BUYER**: create/view own org orders, view own org invoices (including security deposit), buyer dashboards.

## Entity scoping rules

- **BUYER org scoping**: any BUYER access to orders/invoices must be restricted to `session.orgId`.
- **Non-buyer roles**: may access across orgs based on route role gates (e.g. FINANCE receivables).

## API enforcement pattern

- Route must export `requireAuth(requireRole(..., handler))`.
- When a single route supports multiple methods with different roles, wrap per-method:
  - Example:
    - `GET` → `requireRole(["ADMIN","OPS"], handler)`
    - `POST` → `requireRole("ADMIN", handler)`

## Buyer invoice scoping

Invoice ownership is centralized in `lib/invoiceAccess.js`:

- `getInvoiceOrgId(invoice)` resolves the buyer organization from
  `invoice.batch.order.orgId` first, then falls back to `invoice.orgId` for
  standalone invoices such as `SECURITY_DEPOSIT`.
- `buyerCanAccessInvoice(session, invoice)` allows non-buyer roles through and
  restricts BUYER sessions to invoices whose resolved org matches
  `session.orgId`.

Routes using or mirroring this rule:

| Route | Methods | Buyer scoping behavior |
| --- | --- | --- |
| `pages/api/invoices/index.js` | `GET` | BUYER list filters to batch-linked invoices for `session.orgId` or standalone invoices with matching `orgId`. |
| `pages/api/invoices/[id]/index.js` | `GET` | Uses `buyerCanAccessInvoice`; `PATCH` is ADMIN/FINANCE only. |
| `pages/api/invoices/[id]/pdf.js` | `GET` | Checks batch order org or standalone `orgId` before serving PDFs to BUYER sessions. |
| `pages/api/payments.js` | `POST` | BUYER can create payment proof only for an accessible invoice and must pay the exact remaining amount. |
| `pages/api/uploads/payment-proof.js` | `POST` | BUYER can upload proof only for an accessible invoice before receiving a public proof URL. |

When adding invoice routes, include `batch: { include: { order: true } }` or
`orgId` in the invoice query so security-deposit invoices and batch invoices are
scoped consistently.


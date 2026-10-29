# RBAC policy (internal)

This page documents the authentication, role gates, and buyer organization
scoping used by API routes. Treat it as the implementation checklist when
adding routes that expose orders, batches, invoices, payments, or operational
admin data.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Role enum and `User.orgId` | `prisma/schema.prisma` |
| Login and session creation | `pages/api/auth/login.js`, `lib/session.js` |
| Current user and logout | `pages/api/auth/me.js`, `pages/api/auth/logout.js` |
| Authentication wrapper | `lib/requireAuth.js` |
| Role wrapper | `lib/requireRole.js` |
| Invoice ownership helper | `lib/invoiceAccess.js` |
| Buyer order scoping | `pages/api/orders/index.js`, `pages/api/orders/[orderId]/index.js` |
| Buyer invoice scoping | `pages/api/invoices/index.js`, `pages/api/invoices/[id]/index.js`, `pages/api/invoices/[id]/pdf.js` |
| Payment proof and payment creation | `pages/api/uploads/payment-proof.js`, `pages/api/payments.js` |
| Finance payment verification | `pages/api/payments/[paymentId]/verify.js` |

## Roles

| Role | Intended access |
| --- | --- |
| `ADMIN` | Users, buyer organizations and policy fields, products/sites, contracts, security deposit invoices, dashboards, and cross-org operational data. |
| `OPS` | Order acceptance/rejection, batch creation/start/dispatch/completion, inventory, dispatch timelines, delivery challans, and ops dashboards. |
| `FINANCE` | Invoices, payment verification and review history, receivables/aging, credit notes/refunds, finance reports, and finance dashboards. |
| `BUYER` | Own-organization orders, invoices, payment proof upload, payments, buyer catalog views, delivery challans for own batches, and buyer dashboards. |

## Session model

`POST /api/auth/login` validates an active user with bcrypt and creates a row in
`Session`. The response sets an HTTP-only cookie named
`cienergy_session_<slot>`.

Session constraints implemented by `lib/session.js`:

- Slots `1` through `4` are supported; `slot` in the login body and
  `x-session-slot` on later requests select the slot, defaulting to `1`.
- Cookies use `Path=/`, `HttpOnly`, `SameSite=Lax`, a 30-day max age, and
  `Secure` in production.
- `getSession` rejects missing cookies, unknown tokens, inactive users, expired
  sessions, and sessions idle for more than 15 minutes.
- Expired or inactive sessions are deleted, and valid sessions update
  `lastActivityAt` on every authenticated request.

`requireAuth` also assigns `req.requestId` and returns it as `x-request-id`,
using an incoming request/correlation/trace header when present or a generated
UUID otherwise.

## Enforcement patterns

Most API routes should authenticate first, then apply a role gate:

```js
export default requireAuth(requireRole(["ADMIN", "OPS"], handler));
```

Behavior:

- `requireAuth` returns `401` when no valid session can be loaded.
- `requireRole` returns `403` when `req.session.role` is not in the allowed
  role list.
- `requireRole` accepts either a single role string or an array.

Use method-specific gates when one route exposes read and write operations with
different roles. For example, `pages/api/admin/sites.js` allows
`ADMIN`, `OPS`, and `BUYER` to `GET`, but only `ADMIN` to `POST`.
`pages/api/invoices/[id]/index.js` allows `ADMIN`, `FINANCE`, and `BUYER` to
`GET`, but only `ADMIN` and `FINANCE` to `PATCH` IRN fields.

Routes that use only `requireAuth` are intentionally open to any authenticated
role and must perform any entity scoping inside the handler. Examples:

- `GET /api/catalog` returns the authenticated product catalog.
- `GET /api/invoices/[id]/pdf` lets non-buyer roles download invoices across
  organizations, but explicitly rejects buyers whose `session.orgId` does not
  own the invoice.

## Buyer organization scoping

`BUYER` access must be restricted to `session.orgId`; non-buyer roles rely on
the route's role gate for cross-organization access.

Order examples:

- `GET /api/orders` filters buyers with `where: { orgId: session.orgId }`.
- `POST /api/orders` only permits buyers, creates the order with
  `orgId: session.orgId`, and records `createdBy: session.userId`.
- `GET /api/orders/[orderId]` returns `403` when a buyer requests an order from
  another organization.
- `GET /api/batches/[batchId]/challan` permits buyers only when the batch's
  order belongs to their organization.

Invoice examples:

- Batch-linked invoices belong to `invoice.batch.order.orgId`.
- Standalone invoices, such as `SECURITY_DEPOSIT`, belong to `invoice.orgId`.
- `getInvoiceOrgId(invoice)` resolves batch ownership first, then falls back to
  `invoice.orgId`.
- `buyerCanAccessInvoice(session, invoice)` restricts only buyer sessions. It
  returns `true` for non-buyer roles, so routes must still use the correct
  `requireRole` gate.

When using `buyerCanAccessInvoice`, load enough relations for the helper:

```js
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: { batch: { include: { order: true } } },
});

if (!buyerCanAccessInvoice(req.session, invoice)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

## Payment and invoice route gates

| Route | Roles | Additional constraints |
| --- | --- | --- |
| `GET /api/invoices` | `ADMIN`, `FINANCE`, `BUYER` | Buyers receive only invoices where `batch.order.orgId` or `invoice.orgId` matches `session.orgId`. |
| `GET /api/invoices/[id]` | `ADMIN`, `FINANCE`, `BUYER` | Buyers are checked with `buyerCanAccessInvoice`. |
| `PATCH /api/invoices/[id]` | `ADMIN`, `FINANCE` | Only `irn` and `irnDate` are accepted. |
| `GET /api/invoices/[id]/pdf` | Any authenticated role | Buyers are explicitly scoped to their org; non-buyers can download cross-org PDFs. |
| `POST /api/uploads/payment-proof` | `BUYER` | Invoice must exist and belong to the buyer before the file is uploaded to the `payment-proof` bucket. |
| `POST /api/payments` | `BUYER` | Invoice must belong to the buyer; amount must exactly equal the remaining invoice amount. |
| `POST /api/payments/[paymentId]/verify` | `ADMIN`, `FINANCE` | Approves or rejects payment proof and advances batch payment state when applicable. |
| `GET /api/payments/[paymentId]/receipt` | `ADMIN`, `FINANCE`, `BUYER` | Legacy route is authenticated but returns `410`; use in-app invoice/payment views. |
| `GET /api/invoices/receipts/[paymentId]` | `ADMIN`, `FINANCE`, `BUYER` | Legacy route is authenticated but returns `410`; use in-app invoice/payment views. |

## Route-change checklist

Before adding or changing an API route:

1. Wrap the route with `requireAuth` unless it is deliberately public.
2. Add `requireRole` with the smallest role set needed for the operation.
3. For mixed-method routes, gate each method separately instead of sharing a
   broad role list for every method.
4. Scope every buyer query by `session.orgId`.
5. For invoices, account for both batch-linked ownership and standalone
   `invoice.orgId` ownership.
6. Check ownership before creating payments, uploading proof files, or streaming
   PDFs.
7. Preserve audit logging for state-changing actions (`order`, `orderBatch`,
   `invoice`, `payment`, `organization`, and similar entities).

## Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| `401 Unauthorized` | Missing/expired session, inactive user, wrong session slot, or 15-minute inactivity timeout. | Confirm the `cienergy_session_<slot>` cookie, `x-session-slot`, `Session.expiresAt`, `Session.lastActivityAt`, and `User.active`. |
| `403 Forbidden` on buyer invoice/payment routes | Invoice ownership does not resolve to `session.orgId`, or the route did not load `batch.order`. | Check `invoice.batch.order.orgId`, standalone `invoice.orgId`, and the Prisma `include` used before `buyerCanAccessInvoice`. |
| Buyer can list an invoice but cannot pay it | The list route includes both batch-linked and standalone ownership, while payment creation requires the specific invoice lookup to pass `buyerCanAccessInvoice`. | Verify the invoice exists, has the expected owner org, and the payment amount equals the remaining amount. |
| Non-buyer role unexpectedly blocked | The route may have a method-specific gate or a narrower `requireRole` list than the UI expects. | Compare the request method against the route's export wrapper and any inline role checks. |


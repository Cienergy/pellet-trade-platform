# Analytics and reporting (internal)

This page documents the read-only dashboard, BI, report, and export routes.
Use it when changing aggregate queries, dashboard cards, report filters, or CSV
exports.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Role wrapper semantics | `lib/requireAuth.js`, `lib/requireRole.js` |
| Admin KPI dashboard | `pages/api/admin/dashboard.js`, `pages/admin/dashboard.js` |
| Admin BI dashboard | `pages/api/admin/bi-dashboard.js`, `pages/admin/dashboard.js` |
| Ops KPI dashboard | `pages/api/ops/dashboard.js`, `pages/ops/dashboard.js` |
| Ops BI dashboard API | `pages/api/ops/bi-dashboard.js` |
| Finance KPI dashboard | `pages/api/finance/dashboard.js`, `pages/finance/dashboard.js` |
| Finance sales report | `pages/api/finance/sales-report.js`, `pages/finance/reports.js` |
| Finance orders CSV export | `pages/api/finance/orders/export.js`, `pages/finance/reports.js` |
| Finance receivables aging | `pages/api/finance/receivables.js`, `pages/finance/receivables.js` |
| Buyer dashboard insights | `pages/api/buyer/bi-dashboard.js`, `pages/buyer/dashboard.js` |
| Buyer consumption analytics | `pages/api/buyer/consumption-patterns.js` |
| Data model | `prisma/schema.prisma` |

## Access model and scope

All routes are protected with `requireAuth(requireRole(...))`. `requireRole`
checks exact role membership; it does not give ADMIN an implicit bypass. Add
`ADMIN` explicitly when admins should be allowed to call a non-admin report.

| Route | Allowed roles | Data scope |
| --- | --- | --- |
| `GET /api/admin/dashboard` | `ADMIN` | Global counts for active users, products, sites, inventory MT, and orders. |
| `GET /api/admin/bi-dashboard` | `ADMIN` | Global top buyers, product trends, order statuses, 30-day invoice revenue, and site performance. |
| `GET /api/ops/dashboard` | `OPS` | Global pending orders/batches, inventory updates, and seven-day freight completeness. |
| `GET /api/ops/bi-dashboard` | `OPS` | Global batch/order status, site utilization, and intended processing-time metrics. |
| `GET /api/finance/dashboard` | `FINANCE` | Batch-backed finance KPIs excluding rejected orders where the query traverses `invoice.batch.order`. Verified payment count is global. |
| `GET /api/finance/receivables` | `FINANCE` | Batch-backed unpaid invoices excluding rejected orders. |
| `GET /api/finance/sales-report` | `FINANCE`, `ADMIN` | Batch-backed invoices in the selected date range, excluding rejected orders. |
| `GET /api/finance/orders/export` | `FINANCE`, `ADMIN`, `OPS` | Global orders filtered by optional date/status parameters. |
| `GET /api/buyer/bi-dashboard` | `BUYER` | Orders and invoices scoped to `req.session.orgId`. |
| `GET /api/buyer/consumption-patterns` | `BUYER` | Accepted, in-progress, and completed orders scoped to `req.session.orgId`. |

## Endpoint behavior

### Dashboard KPI routes

The `/dashboard` endpoints power role landing pages with compact KPI cards.
They return JSON only and accept no query parameters.

- **Admin** counts active users/products/sites, total inventory MT, and total
  orders.
- **Ops** counts pending approval orders, created batches, inventory history
  rows from the last seven days, and dispatched batches from the last seven days
  with or without `freightCost`.
- **Finance** counts pending payments and invoices for non-rejected batch-backed
  orders, totals invoice revenue, counts verified payments, and derives overdue
  and due-in-seven-day invoice counts from `paymentTerm` or `dueDateOverride`.

### BI dashboard routes

The `/bi-dashboard` endpoints return aggregate arrays used by richer dashboard
cards. They are read-only snapshots, not event streams.

Example admin response shape:

```json
{
  "topBuyers": [{ "orgName": "ABC Industries", "orderCount": 12, "totalMT": 850 }],
  "productTrends": [{ "productName": "Premium Pellets", "batchCount": 7, "totalMT": 410 }],
  "orderStatuses": [{ "status": "ACCEPTED", "count": 4 }],
  "dailyRevenue": [{ "date": "2026-09-14", "amount": 125000 }],
  "sitePerformance": [{ "siteName": "Nagpur", "batchCount": 3, "totalMT": 180 }]
}
```

Buyer BI is tenant-scoped and returns:

- `recentOrders`: last 10 buyer orders with status, created date, total batched
  MT, and delivery location.
- `orderStatusSummary`: counts by order status for the buyer organization.
- `totalSpent`: sum of batch-backed invoice totals for the buyer organization.
- `favoriteProducts`: top five products by batch count and MT.
- `topDeliveryLocations`: top five delivery locations from the latest 200
  buyer orders.

### Finance reports

`GET /api/finance/sales-report?from=2026-07-01&to=2026-09-14`

- `from` and `to` are optional date strings. Without them, the API defaults to
  the last 90 days; the UI initializes its picker to roughly the last two
  months.
- The response includes `totalInvoices`, `totalRevenue`, and grouped arrays for
  `byProduct`, `byBuyer`, and `monthly`.
- The query only includes invoices with a batch and an order whose status is not
  `REJECTED`; security-deposit invoices are outside this report.

`GET /api/finance/orders/export?from=2026-07-01&to=2026-09-14&status=ACCEPTED`

- `from`, `to`, and `status` are optional.
- The export is capped at 2,000 orders and sorted newest first.
- The CSV columns are:

```text
Order ID,Buyer,State,Status,Requested MT,Requested Product,Batched MT,Batches,Created
```

### Receivables aging

`GET /api/finance/receivables` computes outstanding amount as:

```text
invoice.totalAmount - sum(verified payment amounts)
```

The response includes:

- `overdueCount`, `overdueAmount`
- `dueIn7Count`, `dueIn7Amount`
- `overdue` rows
- `dueIn7Days` rows
- `aging` buckets: `0-30`, `31-60`, `61-90`, `90+`

Due dates prefer `Invoice.dueDateOverride`; otherwise they add the payment term
days (`NET_15`, `NET_30`, `NET_60`, or `NET_90`) to `Invoice.createdAt`.

## Maintenance constraints

- Keep dashboard documentation source-backed. The UI often transforms API data
  further before display, so verify both the API route and page before changing
  a metric definition.
- Preserve buyer scoping on buyer analytics by filtering with `req.session.orgId`.
  Never accept an organization ID from a buyer-supplied query string for these
  routes.
- Do not assume security-deposit invoices are included in finance reports. Most
  finance reporting queries traverse `invoice.batch.order`, which excludes
  invoices with `batchId = null`.
- Date query parameters are passed to `new Date(...)` without extra validation.
  Add validation at the API boundary before exposing broader report filters.
- The orders export should use the Prisma relation names from
  `prisma/schema.prisma`; `OrderBatch` currently exposes the plural `invoices`
  relation.
- If the Ops BI processing-time metric is extended or relied on, first align the
  API query with the schema timestamp fields available on `OrderBatch`.
- Aggregates are computed request-time against the primary database; there is no
  pagination, caching layer, or warehouse snapshot behind these routes.

## Change checklist

When adding or changing a dashboard/report metric:

1. Confirm the role list and tenant scope.
2. Confirm rejected, unpaid, security-deposit, and partially paid records are
   intentionally included or excluded.
3. Add or update examples in this page when the response shape changes.
4. Run `npx prisma validate` after relation or schema changes.
5. Run `npm run build` when changing API fields consumed by pages.

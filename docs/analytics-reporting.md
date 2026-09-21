# Analytics and reporting (internal)

This page documents the dashboard, BI, receivables, and export endpoints as
implemented in the API handlers. Use it when changing reporting metrics, role
gates, or frontend dashboard cards.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Admin dashboard totals | `pages/api/admin/dashboard.js` |
| Admin BI cards | `pages/api/admin/bi-dashboard.js` |
| Buyer dashboard order totals | `pages/api/buyer/orders.js`, `pages/buyer/dashboard.js` |
| Buyer BI and consumption patterns | `pages/api/buyer/bi-dashboard.js`, `pages/api/buyer/consumption-patterns.js` |
| Ops dashboard and BI | `pages/api/ops/dashboard.js`, `pages/api/ops/bi-dashboard.js` |
| Finance dashboard KPIs | `pages/api/finance/dashboard.js` |
| Receivables and aging | `pages/api/finance/receivables.js` |
| Sales report | `pages/api/finance/sales-report.js`, `pages/finance/reports.js` |
| Orders CSV export | `pages/api/finance/orders/export.js`, `pages/finance/reports.js` |

All reporting endpoints in the role table below accept `GET` only and return
`405` for other methods.

## Role and scoping rules

| Endpoint | Roles | Scoping |
| --- | --- | --- |
| `/api/admin/dashboard` | `ADMIN` | Global active-user/product/site/inventory/order counts. |
| `/api/admin/bi-dashboard` | `ADMIN` | Global buyer, product, order, revenue, and site aggregates. |
| `/api/buyer/bi-dashboard` | `BUYER` | Restricted to `req.session.orgId`. |
| `/api/buyer/consumption-patterns` | `BUYER` | Restricted to `req.session.orgId`; includes only accepted, in-progress, and completed orders. |
| `/api/ops/dashboard` | `OPS` | Global operations counts and seven-day freight/inventory metrics. |
| `/api/ops/bi-dashboard` | `OPS` | Global batch, site, processing-time, and order status aggregates. |
| `/api/finance/dashboard` | `FINANCE` | Global finance KPIs; invoice-scoped metrics exclude rejected batch orders. |
| `/api/finance/receivables` | `FINANCE` | Global receivables for non-rejected batch orders. |
| `/api/finance/sales-report` | `FINANCE`, `ADMIN` | Date-filtered invoice summary for non-rejected batch orders. |
| `/api/finance/orders/export` | `FINANCE`, `ADMIN`, `OPS` | Date/status-filtered order CSV across organizations. |

Buyer-facing analytics must always use `session.orgId` in the database filter.
If an analytics route later includes invoices directly, use the invoice org
access rules in `lib/invoiceAccess.js` rather than inferring ownership from UI
state.

## Dashboard metric definitions

### Admin

`GET /api/admin/dashboard` returns:

- `users`: active users.
- `products`: active products.
- `sites`: active sites.
- `totalInventoryMT`: sum of `Inventory.availableMT`, or `0` when empty.
- `orders`: total order count.

`GET /api/admin/bi-dashboard` returns:

- `topBuyers`: top five organizations by order count with requested MT sum.
- `productTrends`: top five products by batch count with batch MT sum.
- `orderStatuses`: count by `Order.status`.
- `dailyRevenue`: invoice totals grouped by `createdAt` day for the last 30
  days.
- `sitePerformance`: top five sites by batch count with batch MT sum.

### Buyer

`GET /api/buyer/bi-dashboard` returns only data for the authenticated buyer's
organization:

- `recentOrders`: latest ten orders with status, created date, delivery
  location, and total batched MT.
- `orderStatusSummary`: count by status.
- `totalSpent`: sum of invoice totals for the org's batch invoices.
- `favoriteProducts`: top five products by batch count with batch MT sum.
- `topDeliveryLocations`: top five delivery locations from the latest 200
  orders.

`GET /api/buyer/consumption-patterns` summarizes accepted, in-progress, and
completed orders for the buyer org:

- `totalOrders`, `totalQuantityMT`, and `averageOrderSize`.
- `productBreakdown` with quantity, batch count, invoice value, and average
  price per MT by product.
- `monthlyTrend` keyed as `YYYY-MM`.
- `mostOrderedProduct` by total quantity.
- `orderFrequency.ordersPerMonth` across the active month span.

The buyer dashboard page also derives payment progress from
`GET /api/buyer/orders`; these UI-only totals are not a separate reporting API.

### Ops

`GET /api/ops/dashboard` returns:

- `pendingOrders`: orders in `PENDING_APPROVAL`.
- `inProgressOrders`: orders in `IN_PROGRESS`.
- `pendingBatches`: batches in `CREATED`.
- `inventoryUpdates`: `InventoryHistory` records from the last seven days.
- `freight.sum7d`: freight cost sum for batches dispatched in the last seven
  days with a non-null `freightCost`.
- `freight.missingCount7d`: batches dispatched in the last seven days with no
  `freightCost`.

`GET /api/ops/bi-dashboard` returns batch status counts, site utilization, order
status counts, and `avgProcessingTimeDays`. Processing time is calculated from
`OrderBatch.createdAt` to `updatedAt` for batches currently marked
`COMPLETED`.

### Finance

`GET /api/finance/dashboard` returns payment and invoice KPIs. Invoice counts,
invoice totals, pending payment counts, pending payment amounts, due-date
counts, and overdue-org rows are limited to invoices whose batch order is not
`REJECTED`:

- `pendingPayments`: unverified payments.
- `pendingAmount`: sum of unverified payment amounts.
- `invoices`: invoice count.
- `totalRevenue`: sum of invoice totals.
- `verifiedPayments`: count of all verified payments.
- `overdueCount` and `dueIn7Count`: unpaid invoice counts based on due date.
- `topOverdueOrgs`: up to five organizations sorted by overdue outstanding
  amount.

`GET /api/finance/receivables` uses the same due-date logic and returns:

- `overdueCount`, `overdueAmount`, `dueIn7Count`, `dueIn7Amount`.
- `overdue` and `dueIn7Days` item arrays.
- `aging` buckets: `0-30`, `31-60`, `61-90`, and `90+`.

Due dates use `Invoice.dueDateOverride` first; otherwise they are derived from
`Invoice.createdAt + paymentTerm` using `NET_15`, `NET_30`, `NET_60`, or
`NET_90`, with a 30-day fallback. Outstanding amount is
`invoice.totalAmount - sum(verified payments)`.

## Finance report endpoints

### Sales report

`GET /api/finance/sales-report?from=2026-07-01&to=2026-09-30`

- `from` and `to` are optional. Defaults are the last 90 days through now.
- Filtering uses `Invoice.createdAt`.
- Rejected batch orders are excluded.
- Response groups invoice count and amount by product, buyer, and invoice month.

Example response shape:

```json
{
  "from": "2026-07-01",
  "to": "2026-09-30",
  "totalInvoices": 12,
  "totalRevenue": 4500000,
  "byProduct": [{ "name": "Wood Pellets", "count": 8, "amount": 3200000 }],
  "byBuyer": [{ "name": "Acme Manufacturing", "count": 3, "amount": 900000 }],
  "monthly": [{ "month": "2026-09", "count": 4, "amount": 1400000 }]
}
```

### Orders CSV export

`GET /api/finance/orders/export?from=2026-07-01&to=2026-09-30&status=ACCEPTED`

- `from`, `to`, and `status` are optional.
- Filtering uses `Order.createdAt` and exact `Order.status` when supplied.
- Results are ordered newest first and capped at 2,000 orders.
- Response content type is `text/csv; charset=utf-8`.
- File name is generated as `orders-export-<timestamp>.csv`.

Current columns:

```text
Order ID,Buyer,State,Status,Requested MT,Requested Product,Batched MT,Batches,Created
```

## Maintenance notes

- Date query parameters are passed directly to `new Date(...)`. Callers should
  send ISO date strings (`YYYY-MM-DD` or a full ISO timestamp) and maintainers
  should add validation before exposing broader report filters.
- Sales, receivables, and most finance dashboard aggregates are invoice-based
  and currently rely on `invoice.batch.order`. Security-deposit invoices with
  only `orgId` are not part of these aggregates.
- BI endpoints do not paginate. Keep result sizes bounded with `take` or
  aggregate queries when adding cards.
- When adding CSV columns, quote and escape fields that can contain commas,
  quotes, or newlines; the current export explicitly escapes buyer names.
- Keep frontend dashboard labels aligned with these definitions. Several cards
  derive presentation-only percentages in the page component, not in the API.

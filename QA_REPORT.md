# QA Report — Pellet Trade Platform

**Date:** 2025-03-02  
**Scope:** Full codebase review, build verification, API/page consistency, security and error-handling checks.

---

## 1. Build Status

| Status | Detail |
|--------|--------|
| **Result** | Pass (after fixes) |
| **Command** | `npm run build` |

### Fixes applied during QA

1. **Import paths (finance pages)**  
   - `pages/finance/receivables.js`: `../components/Icons` and `../lib/dateUtils` → `../../components/Icons` and `../../lib/dateUtils`.  
   - `pages/finance/reports.js`: `../components/Icons` → `../../components/Icons`.

2. **Admin buyers create**  
   - `pages/admin/buyers/create.js`: Contained an API-style handler (req/res) but lived under `pages/`, so Next treated it as a page and prerender failed (Promise exported instead of a component).  
   - Replaced with a minimal React page that redirects to `/admin/buyers` (create flow lives there).

3. **Admin buyers create imports**  
   - `pages/admin/buyers/create.js` (before redirect fix): Wrong depth `../../../../lib` → `../../../lib` and use of default exports for `prisma`, `requireAuth`, `requireRole` (no named imports).

### Warnings (non-blocking)

- `pages/api/invoices/receipts/[paymentId].js`: `supabase` is not exported from `lib/supabaseServer` (import may fail at runtime if route is hit).
- `pages/api/orders/batch.js`: `reserveInventory` is not exported from `lib/inventory` (import may fail at runtime).

**Recommendation:** Fix or remove these imports, or guard usage so those routes don’t run without the correct exports.

---

## 2. Security

| Finding | Severity | Location | Notes |
|--------|----------|----------|--------|
| Organizations API unprotected | **High** | `pages/api/admin/organizations/index.js` | Uses hardcoded `isAdmin = true` and does **not** use `requireAuth` / `requireRole`. GET and POST are effectively public. |
| Other admin APIs | OK | e.g. `api/admin/buyers`, `api/admin/organizations/[id]` | Wrapped with `requireAuth(requireRole("ADMIN", ...))`. |

**Recommendation:** Protect `api/admin/organizations` with `requireAuth(requireRole("ADMIN", handler))` (and use the same `prisma` import style as the rest of the app).

---

## 3. API Error Handling

| API | Issue | Recommendation |
|-----|--------|-----------------|
| `PATCH /api/admin/organizations/[id]` | No try/catch; invalid `id` or DB error returns 500. No 404 for missing org. | Wrap in try/catch, return 404 when org not found, 400 for validation. |
| `PATCH /api/batches/[batchId]` | Empty `data` is allowed (no-op update). Invalid `batchId` can yield 500. | Optionally return 400 when no updatable fields; catch Prisma “record not found” and return 404. |
| `GET /api/finance/receivables` | Assumes invoice/batch/org relations exist. | Add null checks for `inv.batch?.order?.org` (already partially done) to avoid runtime errors. |

---

## 4. Frontend / UX

| Area | Issue | Recommendation |
|------|--------|-----------------|
| Finance receivables | On 401/403, redirect runs but the fetch chain can still call `setData(undefined)`, so UI shows “Failed to load receivables” instead of a clear “Session expired” or redirect-only. | After redirect, avoid calling `setData`; or show a short “Redirecting…” message. |
| Receivables / Reports | Non-2xx (e.g. 500) still parsed as JSON and passed to `setData`; UI may render with undefined fields. | Only call `setData` when `res.ok`; otherwise set error state or show a generic error message. |
| Dispatch timeline | Filter “All recent” triggers fetch with no params; empty filter + empty orderId/batchId still triggers effect. | Acceptable; consider debouncing or fetching only when filter is selected to avoid redundant calls. |

---

## 5. Schema & Data

| Item | Status |
|------|--------|
| Prisma schema | Consistent with new fields: `Organization.defaultPaymentTerm`, `creditLimit`; `OrderBatch.eWayBillNumber`, `eWayBillDate`. |
| Migration | `20250302000000_add_org_batch_finance_fields` adds these columns. Run `npx prisma migrate deploy` and `npx prisma generate` in each environment. |
| Invoice create | Correctly uses `batch.order.org.defaultPaymentTerm` when request does not send a payment term. |

---

## 6. Role & Auth Consistency

- **requireRole** supports both a single role (string) and an array of roles; usage is consistent across the new APIs (OPS, ADMIN, FINANCE as needed).
- **Buyer** access: Invoice PDF and challan restrict buyers to their own org; receivables/sales/activity-log are Finance/Admin only.
- **Session:** All new pages that call protected APIs use `credentials: "include"` and redirect on 401/403.

---

## 7. New Features Checklist (logic only)

| Feature | API | Page | Notes |
|---------|-----|------|--------|
| Dispatch timelines | `GET /api/ops/dispatch-timeline` | `/ops/dispatch-timeline` | Supports orderId, batchId, or “all recent”. Events and performance metrics present. |
| Batch margin | `PATCH /api/batches/[batchId]` | Shown in BatchCard and ops batch row | Display correct; PATCH allows empty `data`. |
| Buyer margin / payment term | `PATCH /api/admin/organizations/[id]` | Admin Buyers table + inline edit | Edit and display work; org API index still unprotected. |
| Receivables & aging | `GET /api/finance/receivables` | `/finance/receivables` | Overdue, due-in-7, aging buckets implemented. |
| Sales report | `GET /api/finance/sales-report` | `/finance/reports` | By product, by buyer, monthly; date range used. |
| Orders export | `GET /api/finance/orders/export` | Button on Finance Reports | CSV with from/to/status. |
| Delivery challan | `GET /api/batches/[batchId]/challan` | “Download Challan” on ops batch row | PDF generated; e-way fields optional. |
| Activity log | `GET /api/admin/activity-log` | `/admin/activity-log` | Entity/action filters; actor resolved. |
| Finance dashboard | — | `/finance/dashboard` | Overdue count, due-in-7-days, links to receivables, reports, activity log, dispatch timelines. |
| Default payment term | Invoice create | — | Used when body omits payment term; validated to NET_30/60/90. |
| Audit logging | Various | — | Login, invoice create, contract create, org/batch updates; existing order/batch/payment audits in place. |

---

## 8. Test Coverage

- **Unit / integration tests:** None found (no Jest, Mocha, Vitest, or Cypress in `package.json`).
- **E2E:** Not configured.

**Recommendation:** Add at least smoke tests for critical paths (login, order create, batch create, invoice create, receivables) and run them in CI.

---

## 9. Summary

| Category | Result |
|----------|--------|
| Build | Pass (after import and page fixes) |
| Security | 1 high: protect `api/admin/organizations` |
| API robustness | Add 404/400 and try/catch for PATCH org/batch and receivables |
| UX | Minor: clearer handling of auth/error on receivables and reports |
| New features | Implemented and wired; behavior matches design |
| Tests | None; add for critical flows |

**Fixes applied in this QA:**  
Import paths in `finance/receivables.js` and `finance/reports.js`; `admin/buyers/create.js` converted from API handler to redirect page; build now succeeds.

**Recommended next steps:**  
1. Protect `GET`/`POST` `api/admin/organizations` with auth and role.  
2. Resolve supabase and `reserveInventory` import warnings.  
3. Add error handling and 404 for PATCH org and PATCH batch.  
4. Only set receivables/reports data when `res.ok` and show error state otherwise.

# Pellet Trade Platform

A full-featured pellet trading platform for buyers, operations, finance, and admin. Built with **Next.js**, **PostgreSQL** (Prisma), and role-based access.

---

## Features

### Buyer

- Browse products by region and feedstock; place orders with requested quantity and delivery location.
- Track order status (Created → Pending Approval → Accepted → In Progress → Completed).
- View batches, invoices, and payment due dates; upload payment proof and pay against **Net 30 / Net 60 / Net 90** terms only.
- View consumption patterns (order history, product breakdown, monthly trends).

### Operations (Ops)

- Review and accept or reject orders; create batches (product, site, quantity, delivery date).
- Track **committed vs supplied** volumes with manual reporting; upload **mandatory dispatch image** when marking batch complete.
- **Dispatch timelines**: view batch events (created, left site, dispatched, delivery, invoiced) and delivery performance (days to delivery, transit days, on time).
- Download **delivery challan (PDF)** for dispatched batches; optional e-way bill fields on batch.
- Update inventory by site.

### Finance

- Generate invoices with **GST at transaction value** (Quantity × Price); auto **CGST/SGST** (intra-state) or **IGST** (inter-state); immutable tax fields; sync to ERP when finalized.
- **Payment terms**: Net 30, Net 60, Net 90 only; **default payment term per buyer** (Organization) used when creating invoices.
- **Receivables & aging**: overdue count/amount, due-in-7-days, aging buckets (0–30, 31–60, 61–90, 90+ days).
- **Sales reports**: period summary (by product, by buyer, monthly); **orders export (CSV)** by date range.
- **Activity log**: view user and system actions (entity, action, actor, time).
- Verify payment proofs; download invoice PDFs.

### Admin

- Manage **buyers (organizations)**: name, GST, state; **buyer-level margin** and **default payment term**; optional **credit limit** placeholder.
- **Batch-level margin** and **e-way bill** placeholders on batches.
- **Contracts**: pricing models (no automated enforcement); link org/product, price per MT, dates.
- **Activity log**: filter by entity/action; used for audits and policy design.
- Users, products, sites, BI dashboard.

### Platform behaviour

- **Order completion**: order is marked Completed only when all batches are completed **and** total batched quantity ≥ requested quantity.
- **Payment**: only Net 30 / Net 60 / Net 90; buyer can pay only the invoice amount (no partial arbitrary amounts).
- **Audit**: login, order accept/reject, batch create/complete, dispatch, invoice create, payment verify, contract create, org margin/terms updates.

---

## Tech stack

- **Next.js** (Pages Router), **Prisma**, **PostgreSQL**
- **bcrypt** (passwords), cookie-based **sessions** (multi-device, inactivity timeout)
- **PDFKit** (invoice PDF, delivery challan PDF)
- Optional **Supabase** storage for payment proof and dispatch images

---

## Project structure

```
pellet-trade-platform/
├── pages/
│   ├── api/
│   │   ├── auth/          # login, logout, me
│   │   ├── orders/        # list, create, accept, reject, batches
│   │   ├── batches/       # start, complete, challan PDF, margin/eway PATCH
│   │   ├── invoices/      # create, PDF, list
│   │   ├── payments/      # create, verify, receipt
│   │   ├── finance/       # dashboard, receivables, sales-report, orders/export, payments/history
│   │   ├── admin/         # dashboard, buyers, organizations, contracts, activity-log, bi-dashboard
│   │   ├── ops/           # dashboard, orders, dispatch, dispatch-timeline, inventory
│   │   ├── buyer/         # orders, consumption-patterns, catalog, bi-dashboard
│   │   └── uploads/       # payment-proof, dispatch-image
│   ├── buyer/             # dashboard, orders, catalog, create-order
│   ├── finance/           # dashboard, invoices, payments, receivables, reports
│   ├── ops/               # dashboard, orders, dispatch-timeline, inventory
│   ├── admin/             # dashboard, buyers, users, products, sites, activity-log
│   ├── login.js
│   └── ...
├── components/            # BatchCard, PayInvoiceForm, Icons, Layout, ...
├── lib/                   # prisma, auth, session, requireAuth, requireRole, gst, audit
├── prisma/
│   ├── schema.prisma      # Organization, User, Product, Site, Order, OrderBatch, Invoice, Payment, Contract, AuditLog
│   └── migrations/
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Create `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/pellet_trade"
```

Optional (for payment proof / dispatch image uploads):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Database

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with a user that has role `BUYER`, `OPS`, `FINANCE`, or `ADMIN` (see your seed or create users via Admin).

---

## Key API endpoints

| Area        | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| Auth       | POST   | `/api/auth/login` | Login (audit: login) |
| Orders     | GET/POST | `/api/orders` | List / create orders |
| Orders     | POST   | `/api/orders/[id]/accept` | Ops accept order |
| Orders     | POST   | `/api/orders/[id]/reject` | Ops reject order |
| Batches    | POST   | `/api/orders/[orderId]/batches` | Create batch |
| Batches    | PATCH  | `/api/batches/[batchId]/complete` | Mark batch complete (dispatch) |
| Batches    | PATCH  | `/api/batches/[batchId]` | Update batchMargin, eWayBill |
| Batches    | GET    | `/api/batches/[batchId]/challan` | Delivery challan PDF |
| Ops        | GET    | `/api/ops/dispatch-timeline` | Dispatch timelines (orderId/batchId optional) |
| Ops        | POST   | `/api/ops/dispatch` | Set dispatch image, committed/supplied |
| Invoices   | POST   | `/api/invoices/create` | Create invoice (GST, default payment term from org) |
| Invoices   | GET    | `/api/invoices/[id]/pdf` | Invoice PDF |
| Finance    | GET    | `/api/finance/dashboard` | KPIs including overdue, due-in-7-days |
| Finance    | GET    | `/api/finance/receivables` | Overdue list + aging buckets |
| Finance    | GET    | `/api/finance/sales-report` | Sales summary (from, to) |
| Finance    | GET    | `/api/finance/orders/export` | Orders CSV (from, to, status) |
| Admin      | GET    | `/api/admin/activity-log` | Activity log (entity, action filters) |
| Admin      | PATCH  | `/api/admin/organizations/[id]` | Update buyer margin, defaultPaymentTerm, creditLimit |

---

## Payment terms

- Only **Net 30**, **Net 60**, and **Net 90** are allowed.
- Each buyer (Organization) can have a **default payment term**; invoice creation uses it when no term is supplied.
- Buyers pay the **exact invoice amount** (no arbitrary partial amounts) per invoice.

---

## GST and invoicing

- GST is computed **at invoice generation** on **transaction value** (Quantity × Price).
- Supply is auto-classified **intra-state** (CGST+SGST) or **inter-state** (IGST).
- Tax fields are stored and not recalculated after finalization; finalized invoices can be synced to ERP.

---

## Deployment (e.g. Vercel)

1. Set `DATABASE_URL` (and optional Supabase vars) in the project environment.
2. Run migrations: `npx prisma migrate deploy`.
3. Build: `npm run build`. The app uses `prisma generate` in postinstall.

---

## Optional: Stripe

For payment gateway integration, add Stripe keys to `.env` and use your existing payment flow; the platform currently focuses on **Net 30/60/90** with payment proof upload and finance verification.

---

## License

Proprietary / internal use.

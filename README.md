# **Pellet Trade Platform**

A lightweight prototype of an online pellet-ordering platform for buyers to:

* browse pellets by region, feedstock, lead-time
* place **immediate** or **scheduled** orders
* generate **batch numbers** automatically
* generate **invoices (PDF)**
* configure **three payment models** (full, deposit, installment)
* track an order’s **payment schedule** and mark payments as completed
* store orders locally in `orders.json` for demo/testing

Built using **Next.js**, **Node/Express-style API routes**, and optional **Stripe Checkout** support.

---

## **✨ Key Features**

### **Buyer Experience**

* Select region (North, South, East, West)
* Filter pellets by feedstock → Napier, Groundnut shell, Mustard stalk, Cotton stalk, Soya stalk, Coriander husk, Cane trash
* Real-time availability:

  * **Available Now** (in-region inventory)
  * **Available Within X Days** (manufacturable)
* Schedule orders across multiple batches

### **Payment Options**

1. **Full Payment on Delivery**
2. **Deposit Payment** (e.g., 50% now, 50% on delivery)
3. **Installments** (splits equally across N installments)

### **Server-Side Automations**

* Auto-generated:

  * `orderId`
  * `invoiceNumber`
  * `batchNumber` for each scheduled batch
* Accurate calculation of:

  * `subtotal`
  * `transport charges`
  * `GST (12%)`
  * `grand total`

### **Invoices**

* Generated as PDF (via Puppeteer, local env only)
* Includes:

  * Item list
  * Batch numbers
  * Payment schedule
  * Tax, transport, total

### **Payment Management (Demo-Friendly)**

* “Pay” button → Stripe Checkout (if configured)
* Fallback “Mark As Paid” for demo/testing
* Order automatically becomes **Completed** once all payments marked as paid

---

## **📂 Project Structure**

```
pellet-trade-platform/
├── pages/
│   ├── index.js            (Home)
│   ├── order.js            (Buyer's order page)
│   ├── orders.js           (Order management + payments)
│   ├── api/
│   │   ├── products.js     (Pellet catalog)
│   │   ├── orders.js       (Order creation + invoice generation)
│   │   └── payments.js     (Payment handling + Stripe integration)
├── components/
│   ├── Header.jsx
│   ├── Cart.jsx
│   ├── ProductCard.jsx
│   ├── ScheduleModal.jsx
│   └── Notifications.jsx
├── styles/
│   └── globals.css
├── public/
│   └── invoices/           (Generated PDFs)
├── orders.json              (Stored / mock DB)
└── package.json
```

---

## **🛠️ Running the Project Locally**

### **1. Install dependencies**

```bash
npm install
```

### **2. Start the dev server**

```bash
npm run dev
```

Visit:

```
http://localhost:3000
```

### **3. Verify Orders API**

```bash
curl http://localhost:3000/api/orders
```

---

## **💳 Optional: Stripe Integration**

### **Enable Stripe Checkout**

1. Install Stripe SDK:

```bash
npm install stripe
```

2. Create `.env.local` file:

```
STRIPE_SECRET_KEY=sk_test_**************
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. Restart server:

```bash
npm run dev
```

If Stripe is not configured, the payment flow will automatically use **mock-pay** (demo mode).

---

## **📦 How Orders Are Stored**

All data is stored in `orders.json` at the root of the project.

Each order stores:

```json
{
  "orderId": "ORD-20251209-0001",
  "invoiceNumber": "INV-202512-0001",
  "items": [...],
  "payments": [...],
  "totals": {...},
  "transport": {...},
  "invoiceUrl": "/invoices/INV-202512-0001.pdf"
}
```

---

## **📑 Generating Invoices**

Invoices are generated server-side in `/public/invoices/`
Only works **locally** because Puppeteer cannot run on Vercel without Chrome-AWS-Lambda.

---

## **🧪 Testing Scenarios**

### **Scheduled order with deposit**

1. Go to Order page
2. Add a scheduled order
3. Choose **Deposit** (e.g., 50%)
4. Checkout
5. Open Orders page → Payment Schedule visible
6. Click **Pay** / **Mark as paid**

### **Installment plan**

1. Choose **Installments** (e.g., 3)
2. Confirm batch dates
3. Checkout
4. Observe that installments are spaced monthly

### **Multiple batches**

1. Set 2–4 batches in Schedule modal
2. Each batch receives a unique batch number in invoice

---

## **🧹 Reset Orders**

To clear the system:

```bash
rm orders.json
touch orders.json
echo '{"orders":[]}' > orders.json
```




// pages/api/payments.js
import fs from 'fs-extra'
import path from 'path'

const ORDERS_FILE = path.join(process.cwd(), 'orders.json')

// Optional Stripe integration
let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  try {
    // lazy require to avoid startup error if not installed
    // If you want Stripe, run: npm install stripe
    // and set STRIPE_SECRET_KEY in your environment
    // (e.g., .env.local for local dev)
    // The code below will throw if stripe package is not installed.
    // That's expected; if you plan to use Stripe, install the package.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Stripe = require('stripe')
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  } catch (e) {
    console.warn('Stripe package not installed or failed to init. Run `npm install stripe` if you want Stripe support.', e.message)
    stripe = null
  }
}

async function readOrders() {
  await fs.ensureFile(ORDERS_FILE)
  const data = await fs.readJson(ORDERS_FILE).catch(() => ({ orders: [] }))
  return data
}

async function writeOrders(data) {
  await fs.writeJson(ORDERS_FILE, data, { spaces: 2 })
}

function findOrder(data, orderId) {
    if(!data || !data.orders) return undefined
    return (data.orders || []).find(o =>
      o.orderId === orderId || o.order_id === orderId || o.orderId === (o.order_id) || false
    )
  }
  

// Merge payments by dueDate helper (used to compute aggregated payments if needed)
function mergePayments(payList) {
  const map = {}
  payList.forEach(p => {
    const k = p.dueDate
    if (!map[k]) map[k] = { dueDate: p.dueDate, amount: 0, details: [] }
    map[k].amount += p.amount
    map[k].details.push({ note: p.note || '', itemId: p.itemId, amount: p.amount })
  })
  return Object.values(map)
}

// POST /api/payments?action=create-session
// Body: { orderId, paymentDueDate, amount, currency }
// Returns: { url } (Stripe checkout url) or error
// NOTE: This creates a simple single-line Checkout session for the requested amount.
// It DOES NOT auto-mark order payments as paid; after real Stripe payment you should
// update order state via webhook (not implemented here). For demo we provide a mock mark-paid.
async function createStripeSession(req, res) {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured (STRIPE_SECRET_KEY missing or stripe package not installed)' })
  const { orderId, paymentDueDate, amount, currency = 'INR' } = req.body || {}
  if (!orderId || !amount) return res.status(400).json({ error: 'orderId and amount are required' })

  // Create a Checkout Session
  try {
    // Stripe wants amounts in smallest currency unit; INR -> paise
    const unit_amount = Math.round(Number(amount) * 100)
    const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/orders?highlight=${encodeURIComponent(orderId)}`
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `Payment for ${orderId} — due ${paymentDueDate || ''}` },
            unit_amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl + '&paid=1',
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/orders?highlight=${encodeURIComponent(orderId)}&paid=0`,
      metadata: {
        orderId,
        paymentDueDate: paymentDueDate || '',
      }
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe create session error', err)
    return res.status(500).json({ error: err.message || 'stripe error' })
  }
}

// POST /api/payments?action=mark-paid
// Body: { orderId, dueDate, amount, receiptId (optional) }
// Marks the matching payment (by dueDate) as paid and stores paidAt/receiptId
async function markPaymentAsPaid(req, res) {
  const { orderId, dueDate, amount, receiptId } = req.body || {}
  if (!orderId || !dueDate) return res.status(400).json({ error: 'orderId and dueDate required' })

  const data = await readOrders()
  const order = findOrder(data, orderId)
  if (!order) return res.status(404).json({ error: 'order not found' })

  // find matching payment by dueDate
  const pIndex = (order.payments || []).findIndex(p => p.dueDate === dueDate && (amount == null || Number(p.amount) === Number(amount)))
  if (pIndex === -1) {
    // fallback: if dueDate not found try approximate match
    // try to find by amount if provided
    if (amount != null) {
      const idx = (order.payments || []).findIndex(p => Number(p.amount) === Number(amount))
      if (idx !== -1) {
        order.payments[idx].status = 'paid'
        order.payments[idx].paidAt = new Date().toISOString()
        order.payments[idx].receiptId = receiptId || `RECEIPT-${Date.now()}`
        await writeOrders(data)
        return res.status(200).json({ ok: true, orderId, payment: order.payments[idx] })
      }
    }
    return res.status(404).json({ error: 'payment not found for given dueDate/amount' })
  }

  const payment = order.payments[pIndex]
  payment.status = 'paid'
  payment.paidAt = new Date().toISOString()
  payment.receiptId = receiptId || `RECEIPT-${Date.now()}`

  // Optionally: update order.status if all payments paid
  const allPaid = (order.payments || []).every(p => p.status === 'paid')
  if (allPaid) order.status = 'Completed'

  await writeOrders(data)
  return res.status(200).json({ ok: true, orderId, payment })
}

// POST /api/payments?action=mock-pay
// Body: { orderId, dueDate } — convenience endpoint used by demo to mark as paid
async function mockPay(req, res) {
  // simply call markPaymentAsPaid handler logic
  return markPaymentAsPaid(req, res)
}

// Router
export default async function handler(req, res) {
  const action = req.query.action || (req.method === 'POST' ? req.body?.action : undefined)

  if (req.method === 'GET') {
    // simple health/status or return Stripe enabled flag
    return res.status(200).json({ stripeEnabled: !!stripe })
  }

  if (req.method === 'POST') {
    if (action === 'create-session') return createStripeSession(req, res)
    if (action === 'mark-paid') return markPaymentAsPaid(req, res)
    if (action === 'mock-pay') return mockPay(req, res)

    return res.status(400).json({ error: 'unknown action. valid: create-session, mark-paid, mock-pay' })
  }

  res.setHeader('Allow', ['GET','POST'])
  res.status(405).end('Method Not Allowed')
}

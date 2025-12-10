// pages/api/orders.js
//
// FULL DEPLOY-SAFE VERSION
// • Uses Supabase when env vars exist
// • Falls back to local orders.json when not
// • No React, no client code
// • Safe for Vercel serverless
//

import { createClient } from '@supabase/supabase-js'
import fs from 'fs-extra'
import path from 'path'

// -------------------------------
// ENV + SUPABASE INIT (GUARDED)
// -------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const INVOICE_BUCKET = process.env.SUPABASE_INVOICE_BUCKET || 'invoices'

let supabase = null
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    })
  } catch (err) {
    console.error('Supabase init error:', err)
    supabase = null
  }
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY missing. Using local fallback storage (orders.json).')
}

// -------------------------------
// LOCAL JSON FALLBACK
// -------------------------------
const ORDERS_FILE = path.join(process.cwd(), 'orders.json')

async function readLocalOrders() {
  try {
    await fs.ensureFile(ORDERS_FILE)
    const obj = await fs.readJson(ORDERS_FILE).catch(() => ({ orders: [] }))
    return obj.orders || []
  } catch {
    return []
  }
}

async function writeLocalOrders(orders) {
  await fs.writeJson(ORDERS_FILE, { orders }, { spaces: 2 })
}

// -------------------------------
// HELPERS
// -------------------------------
function pad(n, w = 4) {
  return String(n).padStart(w, '0')
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

function assignBatchNumbers(items) {
  return items.map(it => {
    if (!it.scheduledBatches || it.scheduledBatches.length === 0) {
      it.scheduledBatches = [{
        date: new Date().toISOString().slice(0,10),
        qty: it.qty || 0,
        batchNumber: `BATCH-${todayYMD()}-${pad(Math.floor(Math.random()*9000)+1)}`
      }]
    } else {
      it.scheduledBatches = it.scheduledBatches.map(b => ({
        ...b,
        batchNumber: `BATCH-${todayYMD()}-${pad(Math.floor(Math.random()*9000)+1)}`
      }))
    }
    it.lineTotal = Number(((it.pricePerKg || 0) * (it.qty || 0)).toFixed(2))
    return it
  })
}

// -------------------------------
// PAYMENT SCHEDULE
// -------------------------------
function computePaymentScheduleForItem(item) {
  const total = Number(((item.qty || 0) * (item.pricePerKg || 0)).toFixed(2))
  const plan = item.paymentPlan || { type: 'full' }
  const batches = item.scheduledBatches || []

  const firstBatchDate = batches.length ? new Date(batches[0].date) : new Date()
  const anchor = new Date(firstBatchDate)
  anchor.setDate(anchor.getDate() - (plan.firstPaymentOffsetDays || 0))

  if (plan.type === 'full') {
    const last = batches.length ? new Date(batches[batches.length - 1].date) : new Date()
    return [{
      itemId: item.productId,
      dueDate: last.toISOString().slice(0,10),
      amount: total,
      note: 'Full payment on delivery'
    }]
  }

  if (plan.type === 'deposit') {
    const pct = Number(plan.depositPct || 50)
    const deposit = Number((total * (pct/100)).toFixed(2))
    const balance = Number((total - deposit).toFixed(2))
    const last = batches.length ? new Date(batches[batches.length - 1].date) : new Date()
    return [
      { itemId: item.productId, dueDate: anchor.toISOString().slice(0,10), amount: deposit, note: `Deposit ${pct}%` },
      { itemId: item.productId, dueDate: last.toISOString().slice(0,10), amount: balance, note: 'Balance on delivery' }
    ]
  }

  if (plan.type === 'inst') {
    const n = Math.max(2, Number(plan.instCount || 3))
    const base = Math.floor((total / n) * 100) / 100
    const remainder = Number((total - base*n).toFixed(2))
    const sched = []
    for (let i = 0; i < n; i++) {
      const d = new Date(anchor)
      d.setMonth(d.getMonth() + i)
      sched.push({
        itemId: item.productId,
        dueDate: d.toISOString().slice(0,10),
        amount: Number(((i === 0 ? base + remainder : base)).toFixed(2)),
        note: `Installment ${i+1} of ${n}`
      })
    }
    return sched
  }

  // fallback
  return [{
    itemId: item.productId,
    dueDate: anchor.toISOString().slice(0,10),
    amount: total,
    note: 'Payment'
  }]
}

function mergePayments(pList) {
  const map = {}
  pList.forEach(p => {
    const k = p.dueDate
    if (!map[k]) map[k] = { dueDate: p.dueDate, amount: 0, details: [] }
    map[k].amount += Number(p.amount || 0)
    map[k].details.push({
      note: p.note || '',
      itemId: p.itemId,
      amount: Number(p.amount || 0)
    })
  })
  return Object.values(map)
}

// -------------------------------
// API HANDLER
// -------------------------------
export default async function handler(req, res) {

  // ------------------------------------
  // GET /api/orders
  // ------------------------------------
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Supabase fetch error:', error)
          return res.status(500).json({ error: 'Failed to fetch orders' })
        }
        return res.status(200).json(data || [])
      }

      // LOCAL fallback
      const orders = await readLocalOrders()
      return res.status(200).json(orders)

    } catch (e) {
      console.error('GET /api/orders error:', e)
      return res.status(500).json({ error: e.message })
    }
  }

  // ------------------------------------
  // POST /api/orders
  // ------------------------------------
  if (req.method === 'POST') {
    try {
      const incoming = req.body || {}
      const now = new Date()
      const ymd = todayYMD()
      const seq = String(Date.now()).slice(-5)
      const orderId = `ORD-${ymd}-${pad(seq)}`
      const invoiceNumber = `INV-${now.toISOString().slice(0,7).replace('-','')}-${pad(seq)}`

      // Prepare items
      let items = (incoming.items || []).map(it => ({
        ...it,
        productId: it.productId || it.id || '',
        qty: Number(it.qty || 0),
        pricePerKg: Number(it.pricePerKg || 0),
        scheduledBatches: it.scheduledBatches || [],
        paymentPlan: it.paymentPlan || null
      }))
      items = assignBatchNumbers(items)

      const subtotal = items.reduce((s, it) => s + (it.lineTotal || 0), 0)
      const transportCharge = Number(incoming.transport?.transportCharge || 0)
      const taxable = subtotal + transportCharge
      const tax = Math.round(taxable * 0.12)
      const total = taxable + tax

      const paymentsRaw = items.flatMap(it => computePaymentScheduleForItem(it))
      const payments = mergePayments(paymentsRaw)

      const orderRecord = {
        order_id: orderId,
        invoice_number: invoiceNumber,
        buyer: incoming.buyer || {},
        items: items,
        payments: payments,
        totals: { subtotal, tax, total },
        transport: incoming.transport || {},
        status: 'Placed',
        invoice_url: null,
        created_at: now.toISOString()
      }

      // ---------------------------
      // USE SUPABASE IF CONFIGURED
      // ---------------------------
      if (supabase) {
        const { error } = await supabase.from('orders').insert(orderRecord)
        if (error) {
          console.error('Supabase insert error:', error)
          return res.status(500).json({ error: 'Failed to save order' })
        }

        return res.status(201).json({
          orderId,
          invoiceNumber,
          invoiceUrl: null
        })
      }

      // ---------------------------
      // LOCAL FALLBACK
      // ---------------------------
      const existing = await readLocalOrders()
      existing.unshift(orderRecord)
      await writeLocalOrders(existing)

      return res.status(201).json({
        orderId,
        invoiceNumber,
        invoiceUrl: null
      })

    } catch (e) {
      console.error('POST /api/orders error:', e)
      return res.status(500).json({ error: e.message })
    }
  }

  res.setHeader('Allow', ['GET','POST'])
  return res.status(405).end('Method Not Allowed')
}

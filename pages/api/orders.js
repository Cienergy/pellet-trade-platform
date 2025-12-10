import fs from 'fs-extra'
import path from 'path'
// Note: On Vercel we avoid server-side PDF generation (puppeteer) and rely on client-side jsPDF.

const ORDERS_FILE = path.join(process.cwd(), 'orders.json')
const INVOICE_DIR = path.join(process.cwd(), 'public', 'invoices')
// For local/dev; on Vercel this is read-only/ephemeral.
fs.ensureDirSync(INVOICE_DIR)

function pad(n, width=4){ return String(n).padStart(width,'0') }
function todayYMD(){ return new Date().toISOString().slice(0,10).replace(/-/g,'') }

async function genBatchNumber(seqBase){
  const ymd = todayYMD()
  const seq = Number(await fs.readFile(seqBase).catch(()=>'0')) + 1
  await fs.writeFile(seqBase, String(seq))
  return `BATCH-${ymd}-${pad(seq)}`
}

function splitAndAssignBatches(items){
  // items: {scheduledBatches? or qty}
  const seqFile = path.join(process.cwd(), 'global_batch.seq')
  const assigned = items.map(it => {
    if(it.scheduledBatches && it.scheduledBatches.length){
      it.scheduledBatches = it.scheduledBatches.map((b, idx) => ({ ...b, batchNumber: `BATCH-${todayYMD()}-${pad(Math.floor(Math.random()*9000)+1)}` }))
    } else {
      it.scheduledBatches = [{ date: new Date().toISOString().slice(0,10), qty: it.qty, batchNumber: `BATCH-${todayYMD()}-${pad(Math.floor(Math.random()*9000)+1)}` }]
    }
    it.lineTotal = Number((it.pricePerKg||0) * (it.qty||0))
    return it
  })
  return assigned
}

function calcTaxes(subtotal){
  const tax = Math.round(subtotal * 0.12)
  return { tax, total: subtotal + tax }
}

// ------------------------------
// PAYMENT SCHEDULE
// ------------------------------
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
      dueDate: last.toISOString().slice(0, 10),
      amount: total,
      note: 'Full payment on delivery'
    }]
  }

  if (plan.type === 'deposit') {
    const pct = Number(plan.depositPct || 50)
    const deposit = Number((total * (pct / 100)).toFixed(2))
    const balance = Number((total - deposit).toFixed(2))
    const last = batches.length ? new Date(batches[batches.length - 1].date) : new Date()
    return [
      {
        itemId: item.productId,
        dueDate: anchor.toISOString().slice(0, 10),
        amount: deposit,
        note: `Deposit ${pct}%`
      },
      {
        itemId: item.productId,
        dueDate: last.toISOString().slice(0, 10),
        amount: balance,
        note: 'Balance on delivery'
      }
    ]
  }

  if (plan.type === 'inst') {
    const n = Math.max(2, Number(plan.instCount || 3))
    const base = Math.floor((total / n) * 100) / 100
    const remainder = Number((total - base * n).toFixed(2))
    const out = []
    for (let i = 0; i < n; i++) {
      const d = new Date(anchor)
      d.setMonth(d.getMonth() + i)
      out.push({
        itemId: item.productId,
        dueDate: d.toISOString().slice(0, 10),
        amount: Number(((i === 0 ? base + remainder : base)).toFixed(2)),
        note: `Installment ${i + 1} of ${n}`
      })
    }
    return out
  }

  return [{
    itemId: item.productId,
    dueDate: anchor.toISOString().slice(0, 10),
    amount: total,
    note: 'Payment'
  }]
}

function mergePayments(payList) {
  const map = {}
  payList.forEach(p => {
    const k = p.dueDate
    if (!map[k]) map[k] = { dueDate: p.dueDate, amount: 0, details: [] }
    map[k].amount += Number(p.amount || 0)
    map[k].details.push({ note: p.note || '', itemId: p.itemId, amount: Number(p.amount || 0) })
  })
  return Object.values(map)
}

function buildInvoiceHtml({order, seller, buyer}){
  // compute CGST/SGST split if same state, else IGST
  const sameState = (seller.state && buyer.state && seller.state === buyer.state)
  const taxLabel = sameState ? 'CGST 6% + SGST 6%' : 'IGST 12%'

  const itemsRows = order.items.map((it, idx) => {
    const batchesHtml = (it.scheduledBatches||[]).map(b=>`<div style="font-size:12px;color:#475569">Batch: ${b.batchNumber} • ${b.date} • ${b.qty}kg</div>`).join('')
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${idx+1}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${it.name}<div style="font-size:12px;color:#666">${batchesHtml}</div></td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${it.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${(it.pricePerKg||0).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${(it.lineTotal||0).toFixed(2)}</td>
    </tr>`
  }).join('')

  const html = `
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Invoice ${order.invoiceNumber}</title>
  </head>
  <body style="font-family:Arial,Helvetica,sans-serif;color:#222">
    <div style="max-width:820px;margin:24px auto;padding:20px;border:1px solid #f0f0f0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h2 style="margin:0;color:#0b66a3">Cienergy</h2>
          <div style="margin-top:6px">${seller.address}</div>
          <div style="margin-top:6px">GSTIN: ${seller.gstin}</div>
        </div>
        <div style="text-align:right">
          <h3 style="margin:0">Invoice</h3>
          <div style="margin-top:6px"><strong>${order.invoiceNumber}</strong></div>
          <div style="margin-top:6px">Date: ${order.createdAt?.slice(0,10) || new Date().toISOString().slice(0,10)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:16px;padding:12px;background:#fafafa;border-radius:6px">
        <div>
          <strong>Bill To</strong>
          <div>${buyer.name}</div>
          <div style="font-size:13px;color:#555">${buyer.address || ''}</div>
          <div style="font-size:13px;color:#555">GSTIN: ${buyer.gstin || '-'}</div>
        </div>
        <div style="text-align:right">
          <div><strong>Order ID:</strong> ${order.orderId}</div>
          <div style="margin-top:6px"><strong>Transport:</strong> ${order.transport?.transportMethod || '-'} • ${Number(order.transport?.transportCharge||0).toFixed(2)}</div>
          <div style="margin-top:6px"><strong>Payment:</strong> ${order.paymentTerms || 'As agreed'}</div>
        </div>
      </div>

      <table style="width:100%;margin-top:18px;border-collapse:collapse">
        <thead>
          <tr style="background:#f7fafc">
            <th style="padding:10px;text-align:left">#</th>
            <th style="padding:10px;text-align:left">Description</th>
            <th style="padding:10px;text-align:right">Qty (kg)</th>
            <th style="padding:10px;text-align:right">Rate (₹/kg)</th>
            <th style="padding:10px;text-align:right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="margin-top:12px;display:flex;justify-content:flex-end">
        <div style="width:320px">
          <div style="display:flex;justify-content:space-between;padding:6px 0"><div class="muted">Subtotal</div><div>${order.totals.subtotal.toFixed(2)}</div></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0"><div class="muted">Transport</div><div>${Number(order.transport?.transportCharge||0).toFixed(2)}</div></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0"><div class="muted">${taxLabel}</div><div>${order.totals.tax.toFixed(2)}</div></div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700"><div>Total</div><div>${order.totals.total.toFixed(2)}</div></div>
        </div>
      </div>

      <div style="margin-top:18px;font-size:13px;color:#555">
        <div><strong>Notes:</strong> Please pay as per the payment schedule. Bank details: Bank XYZ, A/C 000011112222, IFSC: ABCD0000</div>
      </div>
    </div>
  </body>
  </html>
  `
  return html
}

export default async function handler(req,res){
  if(req.method === 'GET'){
    const data = await fs.readJson(ORDERS_FILE).catch(()=> ({ orders: [] }))
    return res.status(200).json(data.orders || [])
  }

  if(req.method === 'POST'){
    try {
      await fs.ensureFile(ORDERS_FILE)
      const raw = await fs.readJson(ORDERS_FILE).catch(()=> ({ orders: [] }))

      const incoming = req.body
      const now = new Date()
      const ymd = now.toISOString().slice(0,10).replace(/-/g,'')
      const seq = (raw.orders.length || 0) + 1
      const orderId = `ORD-${ymd}-${pad(seq)}`
      const invoiceNumber = `INV-${now.toISOString().slice(0,7).replace('-','')}-${pad(seq)}`

      // assign batches & compute line totals
      const items = splitAndAssignBatches(incoming.items || [])
      // compute subtotal and totals including transport
      const subtotal = items.reduce((s,i)=> s + (i.lineTotal||0), 0)
      const transportCharge = Number((incoming.transport && incoming.transport.transportCharge) || 0)
      const taxable = subtotal + transportCharge
      const tax = Math.round(taxable * 0.12)
      const total = taxable + tax

      // compute payment schedule from paymentPlan on each item
      const paymentsRaw = items.flatMap(it => computePaymentScheduleForItem(it))
      const payments = mergePayments(paymentsRaw)

      const order = {
        ...incoming,
        orderId, invoiceNumber,
        items,
        createdAt: now.toISOString(),
        transport: incoming.transport || {},
        totals: { subtotal, tax, total },
        payments,
        // Skip server PDF; clients will generate invoices via jsPDF
        invoiceUrl: null,
        status: 'Placed'
      }

      raw.orders.push(order)
      await fs.writeJson(ORDERS_FILE, raw, { spaces: 2 })

      return res.status(201).json({ orderId, invoiceNumber, invoiceUrl: null })
    } catch(e){
      console.error(e)
      return res.status(500).send('Failed to create order: ' + (e.message || e))
    }
  }

  res.setHeader('Allow', ['GET','POST'])
  res.status(405).end('Method not allowed')
}

// pages/api/payment-proof.js
// Accepts { orderId, dueDate, filename, fileBase64 } and stores proof
import { createClient } from '@supabase/supabase-js'
import fs from 'fs-extra'
import path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const PROOF_BUCKET = process.env.SUPABASE_PROOF_BUCKET || 'payment-proofs'

let supabase = null
if (SUPABASE_URL && SUPABASE_KEY) {
  try { supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) }
  catch(e){ console.warn('Supabase init for payment-proof failed', e); supabase = null }
} else {
  console.warn('Missing SUPABASE env for payment-proof; using local fallback.')
}

const ORDERS_FILE = path.join(process.cwd(), 'orders.json')
const LOCAL_PROOF_DIR = path.join(process.cwd(), 'public', 'payment-proofs')

async function readLocalOrders(){ await fs.ensureFile(ORDERS_FILE); const o = await fs.readJson(ORDERS_FILE).catch(()=>({orders:[]})); return o.orders || [] }
async function writeLocalOrders(orders){ await fs.writeJson(ORDERS_FILE, { orders }, { spaces: 2 }) }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method not allowed')
  }
  try {
    const { orderId, dueDate, filename, fileBase64 } = req.body || {}
    if (!orderId || !dueDate || !fileBase64) return res.status(400).json({ error: 'orderId, dueDate and fileBase64 required' })

    const buffer = Buffer.from(fileBase64, 'base64')
    const ts = Date.now()
    const safeName = (filename || `proof-${orderId}`).replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-\.]/g,'')
    const key = `${orderId}/${ts}-${safeName}`

    if (supabase) {
      const { error: uploadErr } = await supabase.storage.from(PROOF_BUCKET).upload(key, buffer, { contentType: 'application/octet-stream', upsert: true })
      if (uploadErr) { console.error('Supabase upload error', uploadErr); return res.status(500).json({ error: 'Failed to upload proof to Supabase' }) }

      let proofUrl = supabase.storage.from(PROOF_BUCKET).getPublicUrl(key).publicURL
      if (!proofUrl) {
        const { data: signed, error: signedErr } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(key, 60*60)
        if (signedErr) console.warn('createSignedUrl error', signedErr)
        proofUrl = signed?.signedURL || null
      }

      const { data: rows, error: fetchErr } = await supabase.from('orders').select('payments,order_id').eq('order_id', orderId).limit(1)
      if (fetchErr) { console.error('fetch order error', fetchErr); return res.status(500).json({ error: 'fetch order failed' }) }
      const order = (rows && rows[0])
      if (!order) return res.status(404).json({ error: 'order not found' })

      const payments = (order.payments || []).map(p => p.dueDate === dueDate ? { ...p, proof_url: proofUrl, proof_uploaded_at: new Date().toISOString() } : p)
      const { error: updateErr } = await supabase.from('orders').update({ payments }).eq('order_id', orderId)
      if (updateErr) { console.error('update payments err', updateErr); return res.status(500).json({ error: 'failed to update order payments' }) }

      const updatedPayment = payments.find(p => p.dueDate === dueDate)
      return res.status(200).json({ ok: true, payment: updatedPayment, proofUrl })
    }

    // local fallback
    await fs.ensureDir(LOCAL_PROOF_DIR)
    const outName = path.join(LOCAL_PROOF_DIR, `${orderId}-${ts}-${safeName}`)
    await fs.writeFile(outName, buffer)

    const orders = await readLocalOrders()
    const idx = orders.findIndex(o => (o.order_id || o.orderId) === orderId)
    if (idx === -1) return res.status(404).json({ error: 'order not found' })
    const payments = orders[idx].payments || []
    for (let p of payments) {
      if (p.dueDate === dueDate) { p.proof_url = `/payment-proofs/${path.basename(outName)}`; p.proof_uploaded_at = new Date().toISOString() }
    }
    orders[idx].payments = payments
    await writeLocalOrders(orders)
    const updatedPayment = payments.find(p => p.dueDate === dueDate)
    return res.status(200).json({ ok: true, payment: updatedPayment, proofUrl: `/payment-proofs/${path.basename(outName)}` })

  } catch (err) {
    console.error('payment-proof handler error', err)
    return res.status(500).json({ error: err.message || 'server error' })
  }
}

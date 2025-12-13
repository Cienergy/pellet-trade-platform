// pages/api/upload-invoice.js
// Safe upload: uses Supabase if configured, otherwise local fallback.
// Writes to Supabase Storage and updates orders table, or writes to public/invoices and orders.json locally.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs-extra'
import path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const INVOICE_BUCKET = process.env.SUPABASE_INVOICE_BUCKET || 'invoices'

let supabase = null
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  } catch (e) {
    console.error('Supabase init error (upload-invoice):', e)
    supabase = null
  }
} else {
  console.warn('Missing SUPABASE env vars for upload-invoice — falling back to local file storage (dev only).')
}

// Local fallback paths
const ORDERS_FILE = path.join(process.cwd(), 'orders.json')
const LOCAL_INV_DIR = path.join(process.cwd(), 'public', 'invoices')

async function readLocalOrders() {
  await fs.ensureFile(ORDERS_FILE)
  const o = await fs.readJson(ORDERS_FILE).catch(() => ({ orders: [] }))
  return o.orders || []
}
async function writeLocalOrders(orders) {
  await fs.writeJson(ORDERS_FILE, { orders }, { spaces: 2 })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method not allowed')
  }

  try {
    const { orderId, filename, fileBase64 } = req.body || {}
    if (!orderId || !fileBase64) return res.status(400).json({ error: 'orderId and fileBase64 required' })

    // validate base64 quickly
    if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
      return res.status(400).json({ error: 'fileBase64 must be a non-empty base64 string' })
    }

    const buffer = Buffer.from(fileBase64, 'base64')
    const ts = Date.now()
    const safeName = (filename || `invoice-${orderId}`).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '')
    const key = `invoices/${orderId}-${ts}-${safeName}`

    if (supabase) {
      // upload to Supabase storage
      const { error: uploadErr } = await supabase.storage.from(INVOICE_BUCKET).upload(key, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })
      if (uploadErr) {
        console.error('Supabase upload error', uploadErr)
        return res.status(500).json({ error: 'Failed to upload to Supabase storage' })
      }

      // try to retrieve public or signed URL
      let invoiceUrl = null
      try {
        const publicUrl = supabase.storage.from(INVOICE_BUCKET).getPublicUrl(key).publicURL
        if (publicUrl) invoiceUrl = publicUrl
        else {
          const { data: signedData, error: signedErr } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(key, 60 * 60)
          if (signedErr) console.warn('createSignedUrl error', signedErr)
          invoiceUrl = signedData?.signedURL || null
        }
      } catch (e) {
        console.warn('Error getting invoice URL', e)
      }

      // update order row invoice_url if orders table exists
      try {
        const { error: updErr } = await supabase.from('orders').update({ invoice_url: invoiceUrl }).eq('order_id', orderId)
        if (updErr) console.warn('Supabase order update warning', updErr)
      } catch (e) {
        console.warn('Supabase update failed', e)
      }

      return res.status(200).json({ ok: true, invoiceUrl })
    }

    // LOCAL fallback: write file to public/invoices and update orders.json
    await fs.ensureDir(LOCAL_INV_DIR)
    const outName = path.join(LOCAL_INV_DIR, `${orderId}-${ts}-${safeName}`)
    await fs.writeFile(outName, buffer)

    // update orders.json if present
    try {
      const orders = await readLocalOrders()
      const idx = orders.findIndex(o => (o.order_id || o.orderId) === orderId || (o.orderId === orderId))
      if (idx !== -1) {
        orders[idx].invoice_url = `/invoices/${path.basename(outName)}`
        await writeLocalOrders(orders)
      }
    } catch (e) {
      console.warn('Failed to update local orders.json with invoice_url', e)
    }

    return res.status(200).json({ ok: true, invoiceUrl: `/invoices/${path.basename(outName)}` })
  } catch (err) {
    console.error('upload-invoice error:', err)
    return res.status(500).json({ error: err.message || 'server error' })
  }
}

import fs from 'fs-extra'
import path from 'path'
const ORDERS_FILE = path.join(process.cwd(), 'orders.json')

function genSeq(key){
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'')
  const seqKey = key + today
  const seq = (Number(fs.existsSync(path.join(process.cwd(), seqKey + '.seq')) ? fs.readFileSync(path.join(process.cwd(), seqKey + '.seq'), 'utf8') : '0') || 0) + 1
  fs.writeFileSync(path.join(process.cwd(), seqKey + '.seq'), String(seq))
  return { today, seq }
}

export default async function handler(req,res){
  if(req.method === 'GET'){
    try {
      const data = await fs.readJson(ORDERS_FILE).catch(()=>({ orders: [] }))
      res.status(200).json(data.orders || [])
    } catch(e){ res.status(500).json([]) }
    return
  }

  if(req.method === 'POST'){
    try {
      await fs.ensureFile(ORDERS_FILE)
      const raw = await fs.readJson(ORDERS_FILE).catch(()=> ({ orders: [] }))
      const order = req.body
      const now = new Date()
      const ymd = now.toISOString().slice(0,10).replace(/-/g,'')
      const seq = (raw.orders.length || 0) + 1
      order.orderId = `ORD-${ymd}-${String(seq).padStart(4,'0')}`
      order.invoiceNumber = `INV-${now.toISOString().slice(0,7).replace('-','')}-${String(seq).padStart(4,'0')}`
      // generate batch numbers
      order.items = (order.items || []).map((it, idx) => {
        const s = genSeq('batch_seq_')
        const scheduled = (it.scheduledBatches || []).map((b, bi)=> ({ ...b, batchNumber: `BATCH-${s.today}-${String(s.seq + bi).padStart(4,'0')}` }))
        if(scheduled.length) it.scheduledBatches = scheduled
        else it.scheduledBatches = [{ date: now.toISOString().slice(0,10), qty: it.qty, batchNumber: `BATCH-${s.today}-${String(s.seq).padStart(4,'0')}` }]
        it.lineTotal = (it.pricePerKg || 0) * (it.qty || 0)
        return it
      })
      order.createdAt = now.toISOString()
      order.totals = order.totals || { subtotal: order.items.reduce((s,i)=> s + (i.lineTotal||0), 0) }
      order.totals.tax = Math.round(order.totals.subtotal*0.12)
      order.totals.total = order.totals.subtotal + order.totals.tax
      order.status = 'Placed'
      raw.orders.push(order)
      await fs.writeJson(ORDERS_FILE, raw, { spaces: 2 })
      res.status(201).json({ orderId: order.orderId, invoiceNumber: order.invoiceNumber })
    } catch(e){
      console.error(e)
      res.status(500).json({ error: 'failed to save order' })
    }
  }
}

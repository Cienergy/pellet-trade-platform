// pages/orders.js
import { useEffect, useState } from 'react'

export default function Orders(){
  const [orders, setOrders] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [loadingPay, setLoadingPay] = useState(false)
  const [loadingReceipt, setLoadingReceipt] = useState(false)
  const [loadingInvoice, setLoadingInvoice] = useState(false)

  useEffect(()=>{
    async function load() {
      const resp = await fetch('/api/orders')
      const data = await resp.json()
      setOrders(data || [])

      const p = new URLSearchParams(window.location.search)
      const h = p.get('highlight')
      if(h) {
        setHighlight(h)
        // open after short delay once orders loaded
        setTimeout(()=> {
          const found = (data || []).find(x => x.orderId === h)
          if(found) setSelected(found)
        }, 250)
      }

      // check payments API for stripe flag
      try {
        const pr = await fetch('/api/payments')
        const pj = await pr.json()
        setStripeEnabled(!!pj.stripeEnabled)
      } catch(e){
        setStripeEnabled(false)
      }
    }
    load()
  }, [])

  async function refreshOrders() {
    const resp = await fetch('/api/orders')
    const data = await resp.json()
    setOrders(data || [])
    if (selected) {
      const found = (data || []).find(x => x.orderId === selected.orderId)
      setSelected(found || null)
    }
  }

  const filtered = orders.filter(o => {
    if(!q) return true
    const t = q.toLowerCase()
    return o.orderId.toLowerCase().includes(t) || (o.invoiceNumber||'').toLowerCase().includes(t) || (o.buyer?.name||'').toLowerCase().includes(t)
  })

  // MARK PAYMENT AS PAID (demo/admin)
  async function markAsPaid(orderId, dueDate, amount) {
    setLoadingPay(true)
    try {
      const resp = await fetch('/api/payments?action=mark-paid', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, dueDate, amount })
      })
      const j = await resp.json()
      if (resp.ok) {
        window.enqueueNotification && window.enqueueNotification('Payment marked as paid', { ttl: 2500 })
        await refreshOrders()
      } else {
        window.enqueueNotification && window.enqueueNotification('Mark paid failed', { variant: 'error' })
        console.error('mark-paid error', j)
      }
    } catch (e) {
      console.error(e)
      window.enqueueNotification && window.enqueueNotification('Error marking paid', { variant: 'error' })
    } finally {
      setLoadingPay(false)
    }
  }

  // Create Stripe session or fallback to mock-pay
  async function payNow(orderId, payment) {
    // payment can be { dueDate, amount }
    setLoadingPay(true)
    try {
      // Prefer server-side Stripe creation (if configured)
      const resp = await fetch('/api/payments?action=create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, paymentDueDate: payment.dueDate, amount: payment.amount, currency: 'INR' })
      })
      const j = await resp.json()
      if (resp.ok && j.url) {
        // open stripe checkout
        window.open(j.url, '_blank')
        // NOTE: real integration should verify payment via webhook and mark-as-paid via webhook handler.
        // For demo, we'll allow the user to click "Mark as paid" or rely on success redirect.
      } else {
        // fallback to mock-pay flow
        // call mock-pay which just marks payment as paid
        const mp = await fetch('/api/payments?action=mock-pay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId, dueDate: payment.dueDate })
        })
        const mj = await mp.json()
        if (mp.ok) {
          window.enqueueNotification && window.enqueueNotification('Mock payment success', { ttl: 2200 })
          await refreshOrders()
        } else {
          console.error('mock-pay failed', mj)
          window.enqueueNotification && window.enqueueNotification('Payment failed', { variant: 'error' })
        }
      }
    } catch (e) {
      console.error('payNow error', e)
      window.enqueueNotification && window.enqueueNotification('Payment failed', { variant: 'error' })
    } finally {
      setLoadingPay(false)
    }
  }

  // Client-side invoice generation (jsPDF)
  async function downloadInvoice(order){
    if(!order) return
    setLoadingInvoice(true)
    try {
      if(!window.jspdf || !window.jspdf.jsPDF){
        await new Promise((resolve, reject)=>{
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
          s.onload = resolve
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ unit:'pt', format:'a4' })
      let y = 50
      const left = 50

      doc.setFontSize(18); doc.setTextColor(11,102,163)
      doc.text('Invoice', left, y); y += 20
      doc.setFontSize(12); doc.setTextColor(60,64,67)
      doc.text(`Order: ${order.orderId}`, left, y); y += 14
      doc.text(`Invoice: ${order.invoiceNumber || '-'}`, left, y); y += 14
      doc.text(`Date: ${order.createdAt?.slice(0,10) || ''}`, left, y); y += 20

      doc.setFontSize(11); doc.text('Items', left, y); y += 12
      order.items.forEach((it, idx) => {
        doc.text(`${idx+1}. ${it.name}`, left, y)
        doc.text(`${it.qty} kg × ${Number(it.pricePerKg||0).toFixed(2)} = ${Number(it.lineTotal||it.qty*it.pricePerKg||0).toFixed(2)}`, left+200, y)
        y += 12
        ;(it.scheduledBatches||[]).forEach(b=>{
          doc.setFontSize(10)
          doc.text(`• Batch ${b.batchNumber || ''} • ${b.date} • ${b.qty}kg`, left+16, y)
          doc.setFontSize(11)
          y += 11
        })
        y += 6
      })

      y += 6
      doc.setFontSize(11)
      doc.text(`Transport: ${order.transport?.transportMethod || '-'} • ${Number(order.transport?.transportCharge||0).toFixed(2)}`, left, y); y += 14
      doc.text(`Subtotal: ${Number(order.totals?.subtotal||0).toFixed(2)}`, left, y); y += 14
      doc.text(`GST (12%): ${Number(order.totals?.tax||0).toFixed(2)}`, left, y); y += 14
      doc.setFontSize(12); doc.text(`Total: ${Number(order.totals?.total||0).toFixed(2)}`, left, y); y += 20

      if(order.payments && order.payments.length){
        doc.setFontSize(11); doc.text('Payment schedule', left, y); y += 12
        order.payments.forEach((p, idx)=>{
          doc.text(`${idx+1}. ${p.dueDate} — ₹${Number(p.amount||0).toFixed(2)} ${p.status==='paid'?'(paid)':''}`, left, y)
          if(p.details && p.details.length){
            doc.setFontSize(10)
            p.details.forEach(d=>{
              doc.text(`• ${d.note || ''} ${d.itemId ? `(${d.itemId})` : ''}`, left+16, y+11)
              y += 11
            })
            doc.setFontSize(11)
            y += 2
          } else {
            y += 12
          }
        })
      }

      doc.save(`${order.orderId}_invoice.pdf`)
    } catch(e){
      console.error('download invoice failed', e)
      window.enqueueNotification && window.enqueueNotification('Failed to download invoice', { variant:'error' })
    } finally {
      setLoadingInvoice(false)
    }
  }

  // Download receipt for a paid payment
  async function downloadReceipt(order, payment){
    if(!payment || payment.status !== 'paid') return
    setLoadingReceipt(true)
    try {
      // lazy-load jsPDF if not present
      if(!window.jspdf || !window.jspdf.jsPDF){
        await new Promise((resolve, reject)=>{
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
          s.onload = resolve
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ unit:'pt', format:'a4' })
      const left = 40
      let y = 50
      doc.setFontSize(16); doc.setTextColor(11,102,163)
      doc.text('Receipt', left, y); y += 20
      doc.setFontSize(11); doc.setTextColor(60,64,67)
      doc.text(`Order: ${order.orderId}`, left, y); y += 14
      doc.text(`Invoice: ${order.invoiceNumber || '-'}`, left, y); y += 14
      doc.text(`Payment due: ${payment.dueDate}`, left, y); y += 14
      doc.text(`Receipt ID: ${payment.receiptId || '-'}`, left, y); y += 14
      if(payment.paidAt){ doc.text(`Paid at: ${payment.paidAt}`, left, y); y += 14 }
      doc.text(`Amount: ₹${Number(payment.amount||0).toFixed(2)}`, left, y); y += 18
      doc.setFontSize(10)
      doc.text(`Buyer: ${order.buyer?.name || 'Buyer'}`, left, y); y += 12
      doc.text(`Status: Paid`, left, y); y += 16
      doc.text('Thank you for your payment.', left, y)
      doc.save(`${order.orderId}_${payment.receiptId || 'receipt'}.pdf`)
    } catch(e){
      console.error('download receipt failed', e)
      window.enqueueNotification && window.enqueueNotification('Failed to download receipt', { variant:'error' })
    } finally {
      setLoadingReceipt(false)
    }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <h2 style={{margin:0}}>Orders</h2>
          <div className="muted">All orders placed — newest first</div>
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Search order / invoice / buyer" value={q} onChange={e=>setQ(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #eef3f7',width:320}}/>
        </div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.length===0 && <div className="card muted">No orders found</div>}
        {filtered.slice().reverse().map(o=>{
          const isHighlighted = highlight && highlight === o.orderId
          return (
            <div key={o.orderId} className={`order-card ${isHighlighted ? 'order-highlight' : ''}`} style={{cursor:'pointer'}} onClick={()=> setSelected(o)}>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div>
                    <div style={{fontWeight:700}}>{o.orderId}</div>
                    <div className="order-meta">{o.createdAt?.slice(0,10)} • {o.buyer?.name || 'Buyer'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:800}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(o.totals?.total || 0)}</div>
                    <div className="order-meta">Status: {o.status || 'Placed'}</div>
                  </div>
                </div>

                <div style={{marginTop:8}} className="muted">
                  Items: {o.items?.length || 0} • Transport: {o.transport?.transportMethod || '-'}
                </div>
              </div>

              <div style={{width:120,textAlign:'right'}}>
                <button className="btn" onClick={(e)=>{ e.stopPropagation(); setSelected(o) }}>View</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order modal */}
      {selected && (
        <div className="modal" onClick={()=> setSelected(null)}>
          <div className="box" onClick={e=> e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{margin:0}}>{selected.orderId}</h3>
                <div className="muted" style={{marginTop:6}}>Invoice: {selected.invoiceNumber}</div>
              </div>
              <div>
                <button className="btn" onClick={()=> downloadInvoice(selected)} disabled={loadingInvoice}>Download Invoice</button>
                <button className="btn ghost" style={{marginLeft:8}} onClick={()=> setSelected(null)}>Close</button>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <table className="invoice-table">
                <thead><tr><th>#</th><th>Description</th><th>Qty (kg)</th><th>Rate/kg</th><th>Amount</th></tr></thead>
                <tbody>
                  {selected.items.map((it,idx)=> (
                    <tr key={idx}>
                      <td>{idx+1}</td>
                      <td>
                        <div style={{fontWeight:700}}>{it.name}</div>
                        {it.scheduledBatches && it.scheduledBatches.map((b,bi)=> <div key={bi} className="small">{`Batch: ${b.batchNumber} • ${b.date} • ${b.qty}kg`}</div>)}
                      </td>
                      <td style={{textAlign:'right'}}>{it.qty}</td>
                      <td style={{textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(it.pricePerKg)}</td>
                      <td style={{textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(it.lineTotal || (it.pricePerKg*it.qty))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                <div style={{width:320}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Subtotal</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals.subtotal)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Transport</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.transport?.transportCharge || 0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">GST (12%)</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals.tax)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontWeight:700}}><div>Total</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals.total)}</div></div>
                </div>
              </div>

              {/* Payment schedule */}
              {selected.payments && selected.payments.length > 0 && (
                <div style={{marginTop:16}}>
                  <h4 style={{margin:0}}>Payment schedule</h4>
                  <table className="invoice-table" style={{marginTop:8}}>
                    <thead><tr><th>Due date</th><th style={{textAlign:'right'}}>Amount</th><th>Details</th><th>Actions</th></tr></thead>
                    <tbody>
                      {selected.payments.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.dueDate}</td>
                          <td style={{textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(p.amount)}</td>
                          <td>
                            {p.details ? p.details.map((d,i)=> <div key={i} className="small">{d.note} • {d.itemId} • ₹{d.amount}</div>) : (p.note || '-')}
                          </td>
                          <td style={{textAlign:'right'}}>
                            {p.status === 'paid' ? (
                              <div style={{textAlign:'right'}}>
                                <div className="small">Paid</div>
                                <div className="small">Receipt: {p.receiptId || '-'}</div>
                                <button className="btn ghost" style={{marginTop:6}} onClick={()=> downloadReceipt(selected, p)} disabled={loadingReceipt}>Download receipt</button>
                              </div>
                            ) : (
                              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                                <button className="btn" onClick={() => payNow(selected.orderId, p)} disabled={loadingPay}>Pay</button>
                                <button className="btn ghost" onClick={() => markAsPaid(selected.orderId, p.dueDate, p.amount)} disabled={loadingPay}>Mark as paid</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

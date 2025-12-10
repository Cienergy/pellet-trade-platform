// pages/orders.js
import { useEffect, useState } from 'react'

export default function Orders(){
  const [orders, setOrders] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [loadingPay, setLoadingPay] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(()=> {
    async function init(){
      await refreshOrders()
      const params = new URLSearchParams(window.location.search)
      const h = params.get('highlight')
      if(h) setHighlight(h)
    }
    init()
  }, [])

  async function refreshOrders(){
    const res = await fetch('/api/orders')
    const json = await res.json()
    setOrders(json || [])
    if(selected){
      const found = (json || []).find(x => (x.order_id || x.orderId) === (selected.order_id || selected.orderId || selected.orderId))
      if(found) setSelected(found)
    }
  }

  const filtered = orders.filter(o => {
    if(!q) return true
    const t = q.toLowerCase()
    const oid = (o.order_id || o.orderId || '').toString().toLowerCase()
    return oid.includes(t) || (o.invoice_number || '').toLowerCase().includes(t) || (o.buyer?.name || '').toLowerCase().includes(t)
  })

  async function markAsPaid(orderId, dueDate, amount){
    setLoadingPay(true)
    try {
      const r = await fetch('/api/payments?action=mark-paid', {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ orderId, dueDate, amount })
      })
      const j = await r.json()
      if(!r.ok) {
        window.enqueueNotification && window.enqueueNotification('Mark paid failed', { variant:'error' })
      } else {
        window.enqueueNotification && window.enqueueNotification('Payment marked paid', { ttl:2200 })
        await refreshOrders()
      }
    } catch(e){
      console.error(e)
      window.enqueueNotification && window.enqueueNotification('Mark paid error', { variant:'error' })
    } finally { setLoadingPay(false) }
  }

  // Upload a client-generated PDF (base64 or file input)
  // This function demonstrates uploading a base64 PDF string via API
  async function uploadInvoice(orderId, file) {
    // file: File object from input
    if(!file) return
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const b64 = Buffer.from(buffer).toString('base64')
      const res = await fetch('/api/upload-invoice', {
        method:'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ orderId, filename: file.name, fileBase64: b64 })
      })
      const j = await res.json()
      if(res.ok){
        window.enqueueNotification && window.enqueueNotification('Invoice uploaded', { ttl:2500 })
        await refreshOrders()
      } else {
        window.enqueueNotification && window.enqueueNotification('Upload failed', { variant:'error' })
        console.error('upload-invoice failed', j)
      }
    } catch(e){
      console.error(e)
      window.enqueueNotification && window.enqueueNotification('Upload error', { variant:'error' })
    } finally { setUploading(false) }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <h2 style={{margin:0}}>Orders</h2>
          <div className="muted">All orders — newest first</div>
        </div>
        <div>
          <input placeholder="Search order / invoice / buyer" value={q} onChange={e=>setQ(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #eef3f7',width:320}}/>
        </div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.length === 0 && <div className="card muted">No orders found</div>}
        {filtered.slice().map(o => {
          const id = o.order_id || o.orderId
          const isHighlighted = highlight && highlight === id
          return (
            <div key={id} className={`order-card ${isHighlighted ? 'order-highlight' : ''}`} style={{cursor:'pointer'}} onClick={()=> setSelected(o)}>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>{id}</div>
                    <div className="order-meta">{(o.created_at || o.createdAt || '').slice(0,10)} • {o.buyer?.name || 'Buyer'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:800}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format((o.totals?.total||0))}</div>
                    <div className="order-meta">Status: {o.status || 'Placed'}</div>
                  </div>
                </div>
                <div style={{marginTop:8}} className="muted">Items: {(o.items || []).length} • Transport: {o.transport?.transportMethod || '-'}</div>
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
                <h3 style={{margin:0}}>{selected.order_id || selected.orderId}</h3>
                <div className="muted" style={{marginTop:6}}>Invoice: {selected.invoice_number || selected.invoiceNumber}</div>
              </div>
              <div>
                {selected.invoice_url ? (
                  <a className="btn" href={selected.invoice_url} target="_blank" rel="noreferrer">Download Invoice</a>
                ) : (
                  <>
                    <label className="btn" style={{cursor:'pointer'}}>
                      Upload invoice
                      <input type="file" accept="application/pdf" style={{display:'none'}} onChange={e=> uploadInvoice(selected.order_id || selected.orderId, e.target.files[0])} />
                    </label>
                    <button className="btn ghost" style={{marginLeft:8}} onClick={()=> setSelected(null)}>Close</button>
                  </>
                )}
              </div>
            </div>

            <div style={{marginTop:12}}>
              {/* Items table */}
              <table className="invoice-table">
                <thead><tr><th>#</th><th>Description</th><th>Qty (kg)</th><th>Rate/kg</th><th>Amount</th></tr></thead>
                <tbody>
                  {(selected.items || []).map((it, idx)=>(
                    <tr key={idx}>
                      <td>{idx+1}</td>
                      <td>
                        <div style={{fontWeight:700}}>{it.name}</div>
                        {(it.scheduledBatches||[]).map((b,i)=> <div key={i} className="small">{`Batch: ${b.batchNumber} • ${b.date} • ${b.qty}kg`}</div>)}
                      </td>
                      <td style={{textAlign:'right'}}>{it.qty}</td>
                      <td style={{textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(it.pricePerKg)}</td>
                      <td style={{textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(it.lineTotal || (it.pricePerKg * it.qty))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* totals */}
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                <div style={{width:320}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Subtotal</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals?.subtotal || 0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Transport</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.transport?.transportCharge || 0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">GST (12%)</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals?.tax || 0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontWeight:700}}><div>Total</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals?.total || 0)}</div></div>
                </div>
              </div>

              {/* Payment schedule */}
              {(selected.payments && selected.payments.length>0) ? (
                <div style={{marginTop:16}}>
                  <h4 style={{margin:0}}>Payment schedule</h4>
                  <table className="invoice-table" style={{marginTop:8}}>
                    <thead><tr><th>Due date</th><th style={{textAlign:'right'}}>Amount</th><th>Details</th><th>Actions</th></tr></thead>
                    <tbody>
                      {selected.payments.map((p, idx)=> (
                        <tr key={idx}>
                          <td>{p.dueDate}</td>
                          <td style={{textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(p.amount)}</td>
                          <td>{(p.details||[]).map((d,i)=> <div key={i} className="small">{d.note} • {d.itemId} • ₹{d.amount}</div>)}</td>
                          <td style={{textAlign:'right'}}>
                            {p.status === 'paid' ? (
                              <div className="small">Paid • {p.receiptId || ''}</div>
                            ) : (
                              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                                <button className="btn" onClick={() => markAsPaid(selected.order_id || selected.orderId, p.dueDate, p.amount)} disabled={loadingPay}>Mark as paid</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="muted small" style={{marginTop:12}}>No payment schedule available.</div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

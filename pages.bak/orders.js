// pages/orders.js
import { useEffect, useState } from 'react'

export default function Orders(){
  const [orders, setOrders] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [loadingPay, setLoadingPay] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(()=> { refreshOrders() }, [])

  async function refreshOrders(){
    const res = await fetch('/api/orders')
    const json = await res.json()
    setOrders(json || [])
    if(selected){
      const key = selected.order_id || selected.orderId
      const found = (json || []).find(o => (o.order_id || o.orderId) === key)
      if(found) setSelected(found)
    }
  }

  const filtered = orders.filter(o => {
    if(!q) return true
    const t = q.toLowerCase()
    const id = (o.order_id || o.orderId || '').toString().toLowerCase()
    return id.includes(t) || (o.invoice_number || '').toLowerCase().includes(t) || (o.buyer?.name || '').toLowerCase().includes(t)
  })

  async function markAsPaid(orderId, dueDate, amount){
    setLoadingPay(true)
    try {
      const r = await fetch('/api/payments?action=mark-paid', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ orderId, dueDate, amount }) })
      const j = await r.json()
      if(!r.ok) { alert('Mark paid failed: ' + (j.error || JSON.stringify(j))); return }
      await refreshOrders()
    } catch(e){ console.error(e); alert('Mark paid error') } finally { setLoadingPay(false) }
  }

  function openPrintable(path){ window.open(path, '_blank', 'noopener,noreferrer') }

  return (
    <div style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div><h2 style={{margin:0}}>Orders</h2><div className="muted">Newest first</div></div>
        <div><input placeholder="Search order/invoice/buyer" value={q} onChange={e=>setQ(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #eef3f7',width:320}}/></div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.length === 0 && <div className="card muted">No orders found</div>}
        {filtered.map(o => {
          const id = o.order_id || o.orderId
          return (
            <div key={id} className="order-card" onClick={()=>setSelected(o)} style={{padding:12,border:'1px solid #eee',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>{id}</div>
                <div className="muted">{(o.created_at||o.createdAt||'').slice(0,10)} • {o.buyer?.name || 'Buyer'}</div>
                <div className="muted" style={{marginTop:6}}>Items: {(o.items||[]).length} • Transport: {o.transport?.transportMethod || '-'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(o.totals?.total||0)}</div>
                <div style={{marginTop:8,display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button className="btn" onClick={(e)=>{ e.stopPropagation(); openPrintable(`/po/${encodeURIComponent(id)}`) }}>Download PO</button>
                  <button className="btn" onClick={(e)=>{ e.stopPropagation(); openPrintable(`/invoice/${encodeURIComponent(id)}`) }}>Download Invoice</button>
                  <button className="btn" onClick={(e)=>{ e.stopPropagation(); openPrintable(`/receipt/${encodeURIComponent(id)}`) }}>Download Receipt</button>
                  <button className="btn ghost" onClick={(e)=>{ e.stopPropagation(); setSelected(o) }}>View</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="modal" onClick={()=>setSelected(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="box" onClick={e=>e.stopPropagation()} style={{width:'90%',maxWidth:1000,background:'#fff',padding:18,borderRadius:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{margin:0}}>{selected.order_id || selected.orderId}</h3>
                <div className="muted">Invoice: {selected.invoice_number || selected.invoiceNumber}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={() => openPrintable(`/po/${encodeURIComponent(selected.order_id || selected.orderId)}`)}>Download PO</button>
                <button className="btn" onClick={() => openPrintable(`/invoice/${encodeURIComponent(selected.order_id || selected.orderId)}`)}>Download Invoice</button>
                <button className="btn ghost" onClick={()=>setSelected(null)}>Close</button>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f7fafc'}}><th style={{padding:10}}>#</th><th style={{padding:10}}>Description</th><th style={{padding:10,textAlign:'right'}}>Qty</th><th style={{padding:10,textAlign:'right'}}>Rate</th><th style={{padding:10,textAlign:'right'}}>Amount</th></tr></thead>
                <tbody>
                  {(selected.items||[]).map((it,idx)=>(
                    <tr key={idx}><td style={{padding:8}}>{idx+1}</td><td style={{padding:8}}><div style={{fontWeight:700}}>{it.name}</div>{(it.scheduledBatches||[]).map((b,i)=><div key={i} className="small">Batch: {b.batchNumber} • {b.date} • {b.qty}kg</div>)}</td><td style={{padding:8,textAlign:'right'}}>{it.qty}</td><td style={{padding:8,textAlign:'right'}}>{it.pricePerKg?.toFixed(2)}</td><td style={{padding:8,textAlign:'right'}}>{(it.lineTotal||0).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>

              <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                <div style={{width:320}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Subtotal</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals?.subtotal||0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Transport</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.transport?.transportCharge||0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">GST (12%)</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals?.tax||0)}</div></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontWeight:700}}><div>Total</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(selected.totals?.total||0)}</div></div>
                </div>
              </div>

              <div style={{marginTop:16}}>
                <h4>Payment schedule</h4>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:'#f7fafc'}}><th style={{padding:8}}>Due date</th><th style={{padding:8,textAlign:'right'}}>Amount</th><th style={{padding:8}}>Details</th><th style={{padding:8}}>Actions</th></tr></thead>
                  <tbody>
                    {(selected.payments||[]).map((p,idx)=>(
                      <tr key={idx}>
                        <td style={{padding:8}}>{p.dueDate}</td>
                        <td style={{padding:8,textAlign:'right'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(p.amount)}</td>
                        <td style={{padding:8}}>{(p.details||[]).map((d,i)=><div key={i} className="small">{d.note} • {d.itemId} • ₹{d.amount}</div>)}</td>
                        <td style={{padding:8,textAlign:'right'}}>
                          {p.status === 'paid' ? (<div className="small">Paid • {p.receiptId || ''}</div>) : (
                            <div style={{display:'flex',gap:8,justifyContent:'flex-end',alignItems:'center'}}>
                              <button className="btn" onClick={async (e)=>{ e.stopPropagation(); // Pay now (Stripe) flow
                                  const payload = { orderId: selected.order_id || selected.orderId, paymentDueDate: p.dueDate, amount: p.amount }
                                  const r = await fetch('/api/payments?action=create-session', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) })
                                  if (r.ok) { const j = await r.json(); if (j.url) { window.location = j.url; } else { alert('Pay now not configured'); } } else { const j = await r.json(); alert('Pay now failed: '+(j.error||JSON.stringify(j))) }
                              }}>Pay now</button>

                              <label className="btn" style={{cursor:'pointer'}}>
                                Attach proof
                                <input type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={async (ev)=> {
                                  ev.stopPropagation()
                                  const file = ev.target.files[0]; if(!file) return
                                  const ab = await file.arrayBuffer()
                                  function ab2b64(buf){ let binary=''; const bytes=new Uint8Array(buf); for(let i=0;i<bytes.byteLength;i++) binary+=String.fromCharCode(bytes[i]); return btoa(binary) }
                                  const b64 = ab2b64(ab)
                                  setUploading(true)
                                  const upl = await fetch('/api/payment-proof', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ orderId: selected.order_id || selected.orderId, dueDate: p.dueDate, filename: file.name, fileBase64: b64 }) })
                                  const uj = await upl.json()
                                  setUploading(false)
                                  if(!upl.ok) { alert('Upload failed: '+(uj.error||JSON.stringify(uj))); } else { alert('Proof uploaded'); await refreshOrders() }
                                }} />
                              </label>

                              <button className="btn" onClick={async (e)=>{ e.stopPropagation(); if(!confirm('Mark this payment as paid?')) return; await markAsPaid(selected.order_id || selected.orderId, p.dueDate, p.amount) }}>Mark as paid</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

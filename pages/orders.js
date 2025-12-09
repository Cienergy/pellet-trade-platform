import { useEffect, useState } from 'react'

export default function Orders(){
  const [orders,setOrders] = useState([])
  const [q,setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [highlight, setHighlight] = useState(null)

  useEffect(()=>{ fetch('/api/orders').then(r=>r.json()).then(data=>{ setOrders(data || []); const params = new URLSearchParams(window.location.search); const h = params.get('highlight'); if(h) setHighlight(h) }) },[])

  const filtered = orders.filter(o => {
    if(!q) return true
    const t = q.toLowerCase()
    return o.orderId.toLowerCase().includes(t) || (o.invoiceNumber||'').toLowerCase().includes(t) || (o.buyer?.name||'').toLowerCase().includes(t)
  })

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
                {selected.invoiceUrl && <a className="btn" href={selected.invoiceUrl} target="_blank" rel="noreferrer">Download Invoice</a>}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

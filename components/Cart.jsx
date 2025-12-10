import { useState, useEffect } from 'react'

export default function Cart({ cart = {}, onRemove = ()=>{}, onEdit = ()=>{}, onCheckout = ()=>{} }){
  const [transport, setTransport] = useState({method:'standard', charge:0})
  const [region, setRegion] = useState('north')

  useEffect(()=>{
    // compute default transport charge by region (simple map) - can be fetched from API
    const map = { north:500, east:700, west:400, south:650 }
    setTransport(t => ({...t, charge: map[region]||500}))
  }, [region])

  const items = Object.entries(cart)
  const subtotal = items.reduce((s,[,it])=> s + (it.pricePerKg||0)*(it.qty||0), 0)
  const transportCharge = Number(transport.charge||0)
  const taxable = subtotal + transportCharge
  const tax = Math.round(taxable * 0.12)
  const total = taxable + tax

  return (
    <div className="card" style={{position:'sticky',top:'calc(1.5rem + 80px)'}}>
      <h4 style={{marginTop:0,marginBottom:'1.5rem',fontSize:'1.25rem',color:'#111827'}}>Cart & Shipping</h4>

      <div style={{marginBottom:'1.5rem'}}>
        <label>Delivery region</label>
        <select value={region} onChange={e=> setRegion(e.target.value)}>
          <option value="north">North</option><option value="east">East</option><option value="west">West</option><option value="south">South</option>
        </select>
      </div>

      <div style={{maxHeight:280, overflowY:'auto',marginBottom:'1.5rem',border:'1px solid #e5e7eb',borderRadius:'0.75rem',padding:'0.5rem'}}>
        {items.length===0 && <div className="muted" style={{textAlign:'center',padding:'2rem'}}>Cart is empty</div>}
        {items.map(([id,it])=>(
          <div className="cart-row" key={id}>
            <div style={{flex:1}}>
              <strong style={{display:'block',marginBottom:'0.25rem',color:'#111827'}}>{it.name}</strong>
              <div className="small" style={{marginBottom:'0.25rem'}}>
                <span className="badge" style={{fontSize:'0.7rem',padding:'0.125rem 0.5rem'}}>
                  {it.mode === 'immediate' ? 'Immediate' : 'Scheduled'}
                </span>
              </div>
              <div className="small" style={{marginBottom:'0.25rem'}}>Qty: <strong>{it.qty} kg</strong></div>
              {it.scheduledBatches && it.scheduledBatches.length>0 && (
                <div className="small" style={{color:'#6b7280',fontSize:'0.75rem'}}>
                  {it.scheduledBatches.map((b,i)=>(
                    <div key={i} style={{marginTop:'0.25rem'}}>📅 {b.date} × {b.qty}kg</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{textAlign:'right',minWidth:'100px'}}>
              <input type="number" min="0" value={it.qty} onChange={(e)=> onEdit(id, Number(e.target.value)||0)} style={{width:80,padding:'0.375rem',marginBottom:'0.5rem',fontSize:'0.875rem'}}/>
              <div>
                <button className="btn ghost" onClick={()=> onRemove(id)} style={{padding:'0.375rem 0.75rem',fontSize:'0.8125rem'}}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:'1.5rem'}}>
        <label>Transport method</label>
        <select value={transport.method} onChange={e=> {
          const m = e.target.value
          const base = m === 'express' ? 1200 : m === 'economy' ? 300 : {standard:600}[m] || 600
          setTransport({method:m, charge: base})
        }}>
          <option value="standard">Standard (default)</option>
          <option value="express">Express (+ higher charge)</option>
          <option value="economy">Economy (+ lower charge)</option>
        </select>
      </div>

      <div className="totals">
        <div><div className="muted">Subtotal</div><div style={{fontWeight:600}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(subtotal)}</div></div>
        <div><div className="muted">Transport</div><div style={{fontWeight:600}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(transportCharge)}</div></div>
        <div><div className="muted">Taxable total</div><div style={{fontWeight:600}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(taxable)}</div></div>
        <div><div className="muted">GST (12%)</div><div style={{fontWeight:600}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(tax)}</div></div>
        <div style={{marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'2px solid #d1d5db'}}>
          <div style={{fontSize:'1.125rem',fontWeight:800,color:'#0b66a3'}}>Total</div>
          <div style={{fontSize:'1.25rem',fontWeight:800,color:'#0b66a3'}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(total)}</div>
        </div>
      </div>

      <div style={{marginTop:'1.5rem'}}>
        <button className="btn" onClick={()=> onCheckout({ transportMethod: transport.method, transportCharge, deliveryRegion:region })} style={{width:'100%',padding:'0.75rem',fontSize:'1rem',fontWeight:700}}>
          Checkout →
        </button>
      </div>
    </div>
  )
}

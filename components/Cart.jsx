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
    <div className="card">
      <h4>Cart & Shipping</h4>

      <div style={{marginTop:8}}>
        <label>Delivery region</label>
        <select value={region} onChange={e=> setRegion(e.target.value)} style={{width:'100%',padding:8,borderRadius:8,border:'1px solid #eef3f7'}}>
          <option value="north">North</option><option value="east">East</option><option value="west">West</option><option value="south">South</option>
        </select>
      </div>

      <div style={{marginTop:12, maxHeight:260, overflow:'auto'}}>
        {items.length===0 && <div className="muted">Cart is empty</div>}
        {items.map(([id,it])=>(
          <div className="cart-row" key={id}>
            <div>
              <strong>{it.name}</strong>
              <div className="small">{it.mode === 'immediate' ? 'Immediate' : 'Scheduled'}</div>
              <div className="small">Qty: {it.qty} kg</div>
              {it.scheduledBatches && it.scheduledBatches.length>0 && <div className="small">{it.scheduledBatches.map(b=>`${b.date} × ${b.qty}kg`).join('; ')}</div>}
            </div>
            <div style={{textAlign:'right'}}>
              <input className="small" type="number" min="0" value={it.qty} onChange={(e)=> onEdit(id, Number(e.target.value)||0)} style={{width:90,padding:6,borderRadius:6,border:'1px solid #eef3f7'}}/>
              <div style={{marginTop:8}}>
                <button className="btn ghost" onClick={()=> onRemove(id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:10}}>
        <label>Transport method</label>
        <select value={transport.method} onChange={e=> {
          const m = e.target.value
          const base = m === 'express' ? 1200 : m === 'economy' ? 300 : {standard:600}[m] || 600
          setTransport({method:m, charge: base})
        }} style={{width:'100%',padding:8,borderRadius:8,border:'1px solid #eef3f7'}}>
          <option value="standard">Standard (default)</option>
          <option value="express">Express (+ higher charge)</option>
          <option value="economy">Economy (+ lower charge)</option>
        </select>
      </div>

      <div className="totals">
        <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Subtotal</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(subtotal)}</div></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Transport</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(transportCharge)}</div></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Taxable total</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(taxable)}</div></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">GST (12%)</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(tax)}</div></div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}><strong>Total</strong><strong>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(total)}</strong></div>
      </div>

      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button className="btn" onClick={()=> onCheckout({ transportMethod: transport.method, transportCharge, deliveryRegion:region })}>Checkout</button>
      </div>
    </div>
  )
}

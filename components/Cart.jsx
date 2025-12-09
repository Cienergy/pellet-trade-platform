export default function Cart({ cart = {}, onRemove = ()=>{}, onEdit = ()=>{}, onCheckout = ()=>{} }){
    const items = Object.entries(cart)
    const subtotal = items.reduce((s,[,it])=> s + (it.pricePerKg||0)*(it.qty||0), 0)
    const tax = Math.round(subtotal*0.12)
    const total = subtotal + tax
    return (
      <div className="card">
        <h4>Cart & Schedules</h4>
        <div style={{maxHeight:320,overflow:'auto',marginTop:8}}>
          {items.length===0 && <div className="muted">Cart is empty</div>}
          {items.map(([id,it])=>(
            <div className="cart-row" key={id}>
              <div>
                <strong>{it.name}</strong>
                <div className="small">{it.mode==='immediate' ? 'Immediate' : 'Scheduled'}</div>
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
        <div className="totals">
          <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">Subtotal</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(subtotal)}</div></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><div className="muted">GST (12%)</div><div>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(tax)}</div></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><strong>Total</strong><strong>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(total)}</strong></div>
        </div>
        <div style={{marginTop:12,display:'flex',gap:8}}>
          <button className="btn" onClick={onCheckout}>Checkout</button>
        </div>
      </div>
    )
  }
  
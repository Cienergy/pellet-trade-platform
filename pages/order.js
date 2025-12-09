import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import Cart from '../components/Cart'
import ScheduleModal from '../components/ScheduleModal'

export default function OrderPage(){
  const [products, setProducts] = useState([])
  const [region, setRegion] = useState('north')
  const [windowDays, setWindowDays] = useState(7)
  const [feedstock, setFeedstock] = useState('')
  const [cart, setCart] = useState({})
  const [modalFor, setModalFor] = useState(null)
  const [checkoutState, setCheckoutState] = useState({loading:false, recentOrder:null, showToast:false})

  useEffect(()=>{ fetch('/api/products').then(r=>r.json()).then(setProducts) },[])

  useEffect(()=>{ const s = localStorage.getItem('pn_cart'); if(s) setCart(JSON.parse(s)) },[])
  useEffect(()=> localStorage.setItem('pn_cart', JSON.stringify(cart)),[cart])

  function addImmediate(p){
    setCart(prev => ({ ...prev, [p.id]: { mode:'immediate', qty: p.minOrderKg, pricePerKg:p.pricePerKg, name:p.name } }))
  }
  function addScheduled(id, payload){
    setCart(prev => ({ ...prev, [id]: { ...payload } }))
  }
  function removeFromCart(id){ setCart(prev => { const c={...prev}; delete c[id]; return c }) }
  function updateQty(id, qty){ setCart(prev=> ({...prev, [id]: {...prev[id], qty}})) }

  async function checkout(transportPayload = { transportMethod:'standard', transportCharge:600, deliveryRegion:region }){
    const items = Object.entries(cart).map(([id, it])=> ({ productId:id, name:it.name, qty:it.qty, pricePerKg:it.pricePerKg, mode:it.mode, scheduledBatches: it.scheduledBatches || [] }))
    if(items.length===0) return alert('Cart empty')
    setCheckoutState({loading:true, recentOrder:null, showToast:false})
    const subtotal = items.reduce((s,i)=> s + (i.pricePerKg||0)*i.qty, 0)
    const taxable = subtotal + Number(transportPayload.transportCharge||0)
    const tax = Math.round(taxable*0.12)
    const payload = {
      buyer:{ name:'Buyer Co', contact:'+91 9xxxxxxxx', state:'Maharashtra' },
      items, totals:{ subtotal, tax, total: subtotal + tax + Number(transportPayload.transportCharge||0) },
      transport: transportPayload
    }
    try {
      const res = await fetch('/api/orders', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) })
      if(res.status === 201){
        const d = await res.json()
        // clear cart and persist minimal
        localStorage.removeItem('pn_cart'); setCart({})
        setCheckoutState({ loading:false, recentOrder: d, showToast:true })
        // auto-hide toast after 3.5s
        setTimeout(()=> setCheckoutState(s=>({...s, showToast:false})), 3500)
        // scroll to orders page after short delay so user can click invoice if desired
        // keep page open; the Orders page will be highlighted on view
      } else {
        const txt = await res.text()
        throw new Error(txt || 'Order failed')
      }
    } catch(err){
      setCheckoutState({loading:false, recentOrder:null, showToast:false})
      alert('Checkout error: '+ (err.message || err))
    }
  }

  const regionFiltered = products.filter(p=>{
    if(feedstock && p.feedstock !== feedstock) return false
    return true
  })
  const nowList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) > 0)
  const laterList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) === 0 && p.leadTimeDays <= windowDays )

  return (
    <div>
      <div className="card controls" style={{marginBottom:14}}>
        <div style={{minWidth:220}}>
          <label>Region</label>
          <select value={region} onChange={e=>setRegion(e.target.value)}><option>north</option><option>east</option><option>west</option><option>south</option></select>
        </div>
        <div style={{minWidth:160}}>
          <label>Max lead time (days)</label>
          <input type="number" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))} />
        </div>
        <div style={{minWidth:260}}>
          <label>Feedstock</label>
          <select value={feedstock} onChange={e=>setFeedstock(e.target.value)}>
            <option value="">Any</option>
            <option>Napier</option><option>Groundnut shell</option><option>Mustard stalk</option><option>Cotton stalk</option><option>Soya stalk</option><option>Coriander husk</option><option>Cane trash</option>
          </select>
        </div>
      </div>

      <div className="grid" style={{marginTop:8}}>
        <main>
          <section className="card" style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Available now</strong><div className="muted">In-region inventory</div>
            </div>
            <div className="products">
              {nowList.length===0 && <div className="muted">No in-region inventory matching filters.</div>}
              {nowList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />)}
            </div>
          </section>

          <section className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Available within {windowDays} days</strong><div className="muted">Producible within window</div>
            </div>
            <div className="products">
              {laterList.length===0 && <div className="muted">No producible items within the requested window.</div>}
              {laterList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />)}
            </div>
          </section>
        </main>

        <aside className="sidebar">
          <Cart cart={cart} onRemove={removeFromCart} onEdit={updateQty} onCheckout={(transport) => checkout(transport)} />
        </aside>
      </div>

      {modalFor && <ScheduleModal product={modalFor} onClose={()=>setModalFor(null)} onSave={(payload)=>{ addScheduled(modalFor.id, payload); setModalFor(null) }} />}

      {/* Success toast */}
      {checkoutState.showToast && checkoutState.recentOrder && (
        <div className="toast">
          Order placed ✓ — {checkoutState.recentOrder.orderId}
        </div>
      )}

      {/* Success panel/modal - persistent until close */}
      {checkoutState.recentOrder && (
        <div className="modal" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="box">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3 style={{margin:0}}>Order placed successfully</h3>
                <div className="muted" style={{marginTop:6}}>Order ID: <strong>{checkoutState.recentOrder.orderId}</strong></div>
                <div className="muted" style={{marginTop:6}}>Invoice: <strong>{checkoutState.recentOrder.invoiceNumber}</strong>
                  {checkoutState.recentOrder.invoiceUrl && <a className="invoice-link" href={checkoutState.recentOrder.invoiceUrl} target="_blank" rel="noreferrer">Download PDF</a>}
                </div>
              </div>
              <div>
                <button className="btn" onClick={()=>{ setCheckoutState({loading:false, recentOrder:null, showToast:false}); window.location.href='/orders' }}>Go to Orders</button>
                <button className="btn ghost" style={{marginLeft:8}} onClick={()=> setCheckoutState({loading:false, recentOrder:null, showToast:false})}>Close</button>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <strong>Next steps</strong>
              <ul style={{marginTop:8}}>
                <li className="small">Download the invoice and share with finance.</li>
                <li className="small">Supplier (Cienergy) will confirm batch dispatch within lead times.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

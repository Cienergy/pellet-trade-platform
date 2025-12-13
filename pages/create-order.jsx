// pages/create-order.jsx
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ProductCard from '../components/ProductCard'
import Cart from '../components/Cart'
import ScheduleModal from '../components/ScheduleModal'
import PaymentModal from '../components/PaymentModal'

const AUTO_REDIRECT_MS = 900 // short delay before redirect to let DB commit

function safeNotify(msg, opts = {}) {
  try { if (typeof window !== 'undefined' && window.enqueueNotification) window.enqueueNotification(msg, opts) } catch(e){ console.warn(e) }
}

export default function CreateOrderPage(){
  const [products, setProducts] = useState([])
  const [region, setRegion] = useState('north')
  const [windowDays, setWindowDays] = useState(7)
  const [feedstock, setFeedstock] = useState('')
  // cart is array of { id, productId, name, qty, pricePerKg, mode, scheduledBatches }
  const [cart, setCart] = useState([])
  const [modalFor, setModalFor] = useState(null)
  const [checkoutState, setCheckoutState] = useState({ loading:false, recentOrder:null })
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(()=>{
    fetch('/api/products', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject('failed'))
      .then(d => setProducts(Array.isArray(d) ? d : (d.data||[])))
      .catch(()=> setProducts([]))
  },[])

  useEffect(()=>{
    try {
      const s = localStorage.getItem('pn_cart_v2')
      if (s) setCart(JSON.parse(s))
    } catch(e){ setCart([]) }
  },[])
  useEffect(()=> {
    try { localStorage.setItem('pn_cart_v2', JSON.stringify(cart)) } catch(e){}
  },[cart])

  function addImmediate(product){
    const item = {
      id: uuidv4(),
      productId: product.id,
      name: product.name,
      qty: product.minOrderKg || 500,
      pricePerKg: product.pricePerKg || 0,
      mode: 'immediate',
      scheduledBatches: []
    }
    setCart(prev => [ ...prev, item ])
    safeNotify('Added to cart', { variant:'info' })
  }

  function addScheduled(productId, payload){
    const item = {
      id: uuidv4(),
      productId,
      name: payload.name || 'Scheduled product',
      qty: payload.qty || 0,
      pricePerKg: payload.pricePerKg || 0,
      mode: 'scheduled',
      scheduledBatches: payload.scheduledBatches || []
    }
    setCart(prev => [ ...prev, item ])
    safeNotify('Scheduled item added', { variant:'info' })
  }

  function removeFromCart(id){ setCart(prev => prev.filter(i => i.id !== id)) }
  function updateQty(id, qty){ setCart(prev => prev.map(i => i.id===id ? {...i, qty} : i)) }

  function estimateTransport(mode = 'truck'){
    if (mode === 'van') return 1800
    if (mode === 'train') return 2200
    return 3000
  }

  async function checkout(transportPayload = { transportMethod:'truck', transportCharge:3000, deliveryRegion:region, paymentPlan:'full' }){
    if (!Array.isArray(cart) || cart.length === 0) {
      safeNotify('Cart is empty', { variant:'error' })
      return
    }
    setCheckoutState({ loading:true, recentOrder:null })
    const items = cart.map(it => ({ productId: it.productId, name: it.name, qty: Number(it.qty||0), pricePerKg: Number(it.pricePerKg||0), mode: it.mode, scheduledBatches: it.scheduledBatches || [] }))
    const subtotal = items.reduce((s,i)=> s + (i.qty * (i.pricePerKg||0)), 0)
    const transportCharge = Number(transportPayload.transportCharge || estimateTransport(transportPayload.transportMethod))
    const tax = Math.round((subtotal + transportCharge) * 0.12)
    const payload = {
      buyer: { name: 'Buyer Co', contact: '+91 9000000000', state: 'Maharashtra' },
      items,
      totals: { subtotal, transport: transportCharge, tax, total: subtotal + transportCharge + tax },
      transport: transportPayload,
      paymentPlan: transportPayload.paymentPlan || 'full'
    }

    try {
      const res = await fetch('/api/orders', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(payload) })
      if (res.status === 201 || res.ok) {
        const d = await res.json()
        localStorage.removeItem('pn_cart_v2')
        setCart([])
        setCheckoutState({ loading:false, recentOrder: d })
        safeNotify(`Order placed — ${d.orderId || (d.order && d.order.id)}`, { variant:'success' })

        // redirect with ts to bust caches and trigger fresh GET
        setTimeout(()=> {
          const id = (d.orderId || (d.order && d.order.id) || '')
          const ts = Date.now()
          window.location.href = `/orders?highlight=${encodeURIComponent(id)}&ts=${ts}`
        }, AUTO_REDIRECT_MS)
      } else {
        const txt = await res.text().catch(()=>null)
        throw new Error(txt || 'Order failed')
      }
    } catch(err){
      console.error('Checkout error', err)
      setCheckoutState({ loading:false, recentOrder:null })
      safeNotify('Checkout failed', { variant:'error' })
    }
  }

  const regionFiltered = products.filter(p => (!feedstock || p.feedstock === feedstock))
  const nowList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) > 0)
  const laterList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) === 0 && (p.leadTimeDays || 999) <= windowDays)

  return (
    <div style={{ padding: 18 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ minWidth:160 }}>
            <label className="small">Region</label>
            <select className="input" value={region} onChange={e=>setRegion(e.target.value)}>
              <option value="north">North</option><option value="east">East</option><option value="west">West</option><option value="south">South</option>
            </select>
          </div>

          <div style={{ minWidth:140 }}>
            <label className="small">Max lead time (days)</label>
            <input className="input" type="number" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))} min="1" />
          </div>

          <div style={{ minWidth:220 }}>
            <label className="small">Feedstock</label>
            <select className="input" value={feedstock} onChange={e=>setFeedstock(e.target.value)}>
              <option value="">Any</option><option>Napier</option><option>Groundnut shell</option><option>Mustard stalk</option><option>Cotton stalk</option>
            </select>
          </div>

          <div style={{ marginLeft:'auto', minWidth:220 }}>
            <label className="small">Search</label>
            <input className="input" placeholder="Search products..." />
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
        <main>
          <section className="card" style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0 }}>Available now</h3>
              <div className="muted">In-region inventory</div>
            </div>
            <div style={{ marginTop:12 }}>
              { nowList.length === 0 ? <div className="muted">No in-region inventory matching filters.</div> : nowList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />) }
            </div>
          </section>

          <section className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0 }}>Available within {windowDays} days</h3>
              <div className="muted">Producible within window</div>
            </div>
            <div style={{ marginTop:12 }}>
              { laterList.length === 0 ? <div className="muted">No producible items within the requested window.</div> : laterList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />) }
            </div>
          </section>
        </main>

        <aside>
          <Cart
            cart={cart}
            onRemove={removeFromCart}
            onEdit={updateQty}
            onCheckout={(payload)=> checkout(payload)}
            estimateTransport={estimateTransport}
            transportMode="truck"
          />

          {/* <div style={{ marginTop:12 }}>
            <button className="btn" onClick={()=> setShowPaymentModal(true)} style={{ width:'100%' }}>Place order</button>
          </div> */}
        </aside>
      </div>

      { modalFor && <ScheduleModal product={modalFor} onClose={()=>setModalFor(null)} onSave={(payload)=>{ addScheduled(modalFor.id, payload); setModalFor(null) }} /> }

      { showPaymentModal && <PaymentModal open={showPaymentModal} onClose={()=>setShowPaymentModal(false)} onSubmit={(p)=>{ checkout(p); setShowPaymentModal(false) }} /> }

      { checkoutState.recentOrder && (
        <div className="modal" style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ maxWidth:640, textAlign:'center' }}>
            <h3>Order placed successfully!</h3>
            <div className="muted">Order ID: <strong>{checkoutState.recentOrder.orderId || (checkoutState.recentOrder.order && checkoutState.recentOrder.order.id)}</strong></div>
            <div style={{ marginTop:16, display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn" onClick={()=> window.location.href = `/orders?highlight=${encodeURIComponent(checkoutState.recentOrder.orderId || (checkoutState.recentOrder.order && checkoutState.recentOrder.order.id))}&ts=${Date.now()}`}>Go to Orders</button>
              <button className="btn ghost" onClick={()=> setCheckoutState({loading:false, recentOrder:null})}>Close</button>
            </div>
          </div>
        </div>
      ) }
    </div>
  )
}

import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import Cart from '../components/Cart'
import ScheduleModal from '../components/ScheduleModal'

const AUTO_REDIRECT_MS = 6000 // 6 seconds; change if required

export default function OrderPage(){
  const [products, setProducts] = useState([])
  const [region, setRegion] = useState('north')
  const [windowDays, setWindowDays] = useState(7)
  const [feedstock, setFeedstock] = useState('')
  const [cart, setCart] = useState({})
  const [modalFor, setModalFor] = useState(null)
  const [checkoutState, setCheckoutState] = useState({loading:false, recentOrder:null})

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
    if(items.length===0) {
      if(window.enqueueNotification) window.enqueueNotification('Cart is empty', { variant:'error' })
      return
    }
    setCheckoutState({loading:true, recentOrder:null})
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
        localStorage.removeItem('pn_cart'); setCart({})
        setCheckoutState({loading:false, recentOrder: d})
        if(window.enqueueNotification) window.enqueueNotification(`Order placed — ${d.orderId}`, { ttl: 3500 })
        // auto-redirect after short delay; keep modal visible so user can click invoice
        setTimeout(()=> {
          // navigate to orders page and highlight order
          window.location.href = `/orders?highlight=${encodeURIComponent(d.orderId)}`
        }, AUTO_REDIRECT_MS)
      } else {
        const txt = await res.text()
        throw new Error(txt || 'Order failed')
      }
    } catch(err){
      setCheckoutState({loading:false, recentOrder:null})
      if(window.enqueueNotification) window.enqueueNotification('Checkout failed', { variant:'error', ttl:4000 })
      console.error('Checkout error', err)
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
      <div className="card controls" style={{marginBottom:'1.5rem',background:'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'}}>
        <div style={{minWidth:220}}>
          <label>Region</label>
          <select value={region} onChange={e=>setRegion(e.target.value)}><option>north</option><option>east</option><option>west</option><option>south</option></select>
        </div>
        <div style={{minWidth:160}}>
          <label>Max lead time (days)</label>
          <input type="number" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))} min="1" />
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
          <section className="card" style={{marginBottom:'1.5rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',paddingBottom:'0.75rem',borderBottom:'2px solid #e5e7eb'}}>
              <h3 style={{margin:0,fontSize:'1.25rem',fontWeight:700}}>Available now</h3>
              <div className="muted" style={{fontSize:'0.875rem',fontWeight:600}}>In-region inventory</div>
            </div>
            <div className="products">
              {nowList.length===0 && <div className="muted" style={{textAlign:'center',padding:'2rem'}}>No in-region inventory matching filters.</div>}
              {nowList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />)}
            </div>
          </section>

          <section className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',paddingBottom:'0.75rem',borderBottom:'2px solid #e5e7eb'}}>
              <h3 style={{margin:0,fontSize:'1.25rem',fontWeight:700}}>Available within {windowDays} days</h3>
              <div className="muted" style={{fontSize:'0.875rem',fontWeight:600}}>Producible within window</div>
            </div>
            <div className="products">
              {laterList.length===0 && <div className="muted" style={{textAlign:'center',padding:'2rem'}}>No producible items within the requested window.</div>}
              {laterList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />)}
            </div>
          </section>
        </main>

        <aside className="sidebar">
          <Cart cart={cart} onRemove={removeFromCart} onEdit={updateQty} onCheckout={(transport) => checkout(transport)} />
        </aside>
      </div>

      {modalFor && <ScheduleModal product={modalFor} onClose={()=>setModalFor(null)} onSave={(payload)=>{ addScheduled(modalFor.id, payload); setModalFor(null) }} />}

      {/* persistent success modal while recentOrder exists */}
      {checkoutState.recentOrder && (
        <div className="modal" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="box" style={{maxWidth:'600px',textAlign:'center'}}>
            <div style={{marginBottom:'2rem'}}>
              <div style={{width:'64px',height:'64px',margin:'0 auto 1rem',background:'linear-gradient(135deg, #10b981 0%, #34d399 100%)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>
                ✓
              </div>
              <h3 style={{margin:0,marginBottom:'0.5rem',fontSize:'1.75rem',fontWeight:800,color:'#111827'}}>Order placed successfully!</h3>
              <div className="muted" style={{marginTop:'0.5rem',fontSize:'1rem'}}>
                Order ID: <strong style={{color:'#111827'}}>{checkoutState.recentOrder.orderId}</strong>
              </div>
              <div className="muted" style={{marginTop:'0.5rem',fontSize:'1rem'}}>
                Invoice: <strong style={{color:'#111827'}}>{checkoutState.recentOrder.invoiceNumber}</strong>
                {checkoutState.recentOrder.invoiceUrl && (
                  <a className="invoice-link" href={checkoutState.recentOrder.invoiceUrl} target="_blank" rel="noreferrer" style={{marginLeft:'0.5rem'}}>
                    Download PDF
                  </a>
                )}
              </div>
            </div>

            <div style={{marginTop:'1.5rem',paddingTop:'1.5rem',borderTop:'2px solid #e5e7eb',display:'flex',gap:'0.75rem',justifyContent:'center'}}>
              <button className="btn" onClick={()=>{ window.location.href = `/orders?highlight=${encodeURIComponent(checkoutState.recentOrder.orderId)}` }} style={{padding:'0.75rem 1.5rem'}}>
                Go to Orders
              </button>
              <button className="btn ghost" onClick={()=> setCheckoutState({loading:false, recentOrder:null})} style={{padding:'0.75rem 1.5rem'}}>
                Close
              </button>
            </div>

            <div style={{marginTop:'1rem'}}>
              <div className="small" style={{color:'#6b7280'}}>You will be redirected to Orders in a few seconds.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


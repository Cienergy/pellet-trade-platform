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

  async function checkout(){
    const items = Object.entries(cart).map(([id, it])=> ({ productId:id, name:it.name, qty:it.qty, pricePerKg:it.pricePerKg, mode:it.mode, scheduledBatches: it.scheduledBatches || [] }))
    const subtotal = items.reduce((s,i)=> s + (i.pricePerKg||0)*i.qty, 0)
    const tax = Math.round(subtotal*0.12)
    const payload = { buyer:{name:'Buyer Co'}, items, totals:{ subtotal, tax, total: subtotal+tax } }
    const res = await fetch('/api/orders', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) })
    if(res.status===201){ const d = await res.json(); localStorage.removeItem('pn_cart'); setCart({}); window.location.href = `/orders?highlight=${d.orderId}` }
    else alert('Failed to place order')
  }

  const regionFiltered = products.filter(p=>{
    if(feedstock && p.feedstock !== feedstock) return false
    return true
  })

  // split into available now and within window
  const nowList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) > 0)
  const laterList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) === 0 && p.leadTimeDays <= windowDays )

  return (
    <div className="container">
      <header className="header">
        <div className="brand"><div className="logo">CIC</div><div>
          <h1>Order Pellets</h1>
          <div className="sub">Select region & delivery window — priced in INR</div>
        </div></div>
        <nav className="nav">
          <a href="/" className="nav-link">Home</a>
          <a href="/orders" className="nav-link">Orders</a>
        </nav>
      </header>

      <div className="card controls" style={{marginTop:12}}>
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

      <div className="grid" style={{marginTop:18}}>
        <main>
          <section className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Available now</strong><div className="muted">In-region inventory</div>
            </div>
            <div className="products">
              {nowList.length===0 && <div className="muted">No in-region inventory matching filters.</div>}
              {nowList.map(p => <ProductCard key={p.id} product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} />)}
            </div>
          </section>

          <section className="card" style={{marginTop:12}}>
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
          <Cart cart={cart} onRemove={removeFromCart} onEdit={updateQty} onCheckout={checkout} />
        </aside>
      </div>

      {modalFor && <ScheduleModal product={modalFor} onClose={()=>setModalFor(null)} onSave={(payload)=>{ addScheduled(modalFor.id, payload); setModalFor(null) }} />}
    </div>
  )
}

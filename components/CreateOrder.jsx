// pages/create-order.jsx
import React from "react";
import ProductCard from "../components/ProductCard";
import Cart from "../components/Cart";
import ScheduleModal from "../components/ScheduleModal";
import Layout from "../components/Layout";

/* A clean, compact Create Order page that preserves the existing data flow.
   It fetches /api/products and uses localStorage pn_cart (same behavior you had).
   No backend changes. Only UI improvements. */

export default function CreateOrderPage() {
  const [products, setProducts] = React.useState([]);
  const [region, setRegion] = React.useState("north");
  const [windowDays, setWindowDays] = React.useState(7);
  const [feedstock, setFeedstock] = React.useState("");
  const [cart, setCart] = React.useState({});
  const [modalFor, setModalFor] = React.useState(null);
  const [checkoutState, setCheckoutState] = React.useState({ loading:false, recentOrder:null });

  React.useEffect(()=> {
    fetch("/api/products").then(r=>r.json()).then(d=>{
      setProducts(Array.isArray(d)? d : (d.products || []));
    }).catch(e=> console.error("products fetch", e));
  },[]);

  React.useEffect(()=> {
    const s = localStorage.getItem('pn_cart'); if(s) setCart(JSON.parse(s));
  },[]);
  React.useEffect(()=> localStorage.setItem('pn_cart', JSON.stringify(cart)),[cart]);

  function addImmediate(p){
    setCart(prev => ({ ...prev, [p.productId || p.id]: { mode:'immediate', qty: p.minOrderKg || 1000, pricePerKg:p.pricePerKg, name:p.name } }));
  }
  function addScheduled(id, payload){
    setCart(prev => ({ ...prev, [id]: { ...payload } }));
  }
  function removeFromCart(id){ setCart(prev => { const c={...prev}; delete c[id]; return c }) }
  function updateQty(id, qty){ setCart(prev=> ({...prev, [id]: {...prev[id], qty}})) }

  async function checkout(transportPayload = { transportMethod:'standard', transportCharge:600, deliveryRegion:region }){
    const items = Object.entries(cart).map(([id, it])=> ({ productId:id, name:it.name, qty:it.qty, pricePerKg:it.pricePerKg, mode:it.mode, scheduledBatches: it.scheduledBatches || [] }));
    if(items.length===0) return alert("Cart is empty");

    setCheckoutState({loading:true, recentOrder:null});
    const subtotal = items.reduce((s,i)=> s + (i.pricePerKg||0)*i.qty, 0);
    const taxable = subtotal + Number(transportPayload.transportCharge||0);
    const tax = Math.round(taxable*0.12);
    const payload = {
      buyer:{ name:'Buyer Co', contact:'+91 9xxxxxxxx', state:'Maharashtra' },
      items, totals:{ subtotal, tax, total: subtotal + tax + Number(transportPayload.transportCharge||0) },
      transport: transportPayload
    };

    try {
      const res = await fetch('/api/orders', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) });
      if(res.status === 201){
        const d = await res.json();
        localStorage.removeItem('pn_cart'); setCart({});
        setCheckoutState({loading:false, recentOrder: d});
        if(window.enqueueNotification) window.enqueueNotification(`Order placed — ${d.orderId}`, { ttl:3500 });
        setTimeout(()=> window.location.href = `/orders?highlight=${encodeURIComponent(d.orderId)}`, 1500);
      } else {
        const txt = await res.text();
        throw new Error(txt || 'Order failed');
      }
    } catch(err){
      setCheckoutState({loading:false, recentOrder:null});
      console.error('Checkout error', err);
      alert("Checkout failed: " + (err?.message || err));
    }
  }

  const regionFiltered = products.filter(p=>{
    if(feedstock && p.feedstock !== feedstock) return false;
    return true;
  });
  const nowList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) > 0);
  const laterList = regionFiltered.filter(p => (p.stockByRegion?.[region] || 0) === 0 && p.leadTimeDays <= windowDays );

  return (
    <Layout>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
        <div>
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
            <div style={{ minWidth:220 }}>
              <label style={{ display:'block', fontSize:13, marginBottom:6 }}>Region</label>
              <select value={region} onChange={e=>setRegion(e.target.value)} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e6eef6' }}>
                <option value="north">North</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="south">South</option>
              </select>
            </div>

            <div style={{ minWidth:160 }}>
              <label style={{ display:'block', fontSize:13, marginBottom:6 }}>Max lead time (days)</label>
              <input type="number" value={windowDays} onChange={e=>setWindowDays(Number(e.target.value))} min="1" style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e6eef6' }} />
            </div>

            <div style={{ minWidth:260 }}>
              <label style={{ display:'block', fontSize:13, marginBottom:6 }}>Feedstock</label>
              <select value={feedstock} onChange={e=>setFeedstock(e.target.value)} style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e6eef6' }}>
                <option value="">Any</option>
                <option>Napier</option><option>Groundnut shell</option><option>Mustard stalk</option><option>Cotton stalk</option><option>Soya stalk</option><option>Coriander husk</option><option>Cane trash</option>
              </select>
            </div>
          </div>

          <section style={{ marginBottom:18, background:'#fff', padding:14, borderRadius:10, boxShadow:'0 6px 18px rgba(13,38,59,0.03)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0 }}>Available now</h3>
              <div style={{ color:'#6b7280', fontSize:13 }}>{nowList.length} items</div>
            </div>
            <div>
              {nowList.length===0 && <div style={{ color:'#6b7280', padding:20, borderRadius:8 }}>No in-region inventory matching filters.</div>}
              {nowList.map(p => <div key={p.productId || p.id} style={{ marginBottom:12 }}><ProductCard product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} /></div>)}
            </div>
          </section>

          <section style={{ background:'#fff', padding:14, borderRadius:10, boxShadow:'0 6px 18px rgba(13,38,59,0.03)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0 }}>Available within {windowDays} days</h3>
              <div style={{ color:'#6b7280', fontSize:13 }}>{laterList.length} items</div>
            </div>
            <div>
              {laterList.length===0 && <div style={{ color:'#6b7280', padding:20, borderRadius:8 }}>No producible items within the requested window.</div>}
              {laterList.map(p => <div key={p.productId || p.id} style={{ marginBottom:12 }}><ProductCard product={p} region={region} onAdd={()=>addImmediate(p)} onSchedule={()=>setModalFor(p)} /></div>)}
            </div>
          </section>
        </div>

        <aside style={{ position:'sticky', top:20 }}>
          <div style={{ padding:16, borderRadius:12, background:'#fff', boxShadow:'0 6px 18px rgba(13,38,59,0.03)' }}>
            <h3 style={{ marginTop:0 }}>Your cart</h3>
            <Cart cart={cart} onRemove={removeFromCart} onEdit={updateQty} onCheckout={(transport)=>checkout(transport)} />
            <div style={{ marginTop:12, display:'flex', gap:8 }}>
              <button onClick={()=>checkout()} style={{ flex:1, padding:'10px 12px', borderRadius:8, border:'none', background:'#0b69a3', color:'#fff' }}>
                Place order
              </button>
            </div>
          </div>
        </aside>
      </div>

      {modalFor && <ScheduleModal product={modalFor} onClose={()=>setModalFor(null)} onSave={(payload)=>{ addScheduled(modalFor.productId || modalFor.id, payload); setModalFor(null) }} />}

      {/* success toast/modal */}
      {checkoutState.recentOrder && (
        <div style={{ position:'fixed', right:20, bottom:20, width:360 }}>
          <div style={{ padding:16, borderRadius:12, background:'#0b69a3', color:'#fff', boxShadow:'0 10px 30px rgba(11,105,163,0.16)' }}>
            <div style={{ fontWeight:800 }}>Order placed</div>
            <div style={{ marginTop:6 }}>Order ID: <strong>{checkoutState.recentOrder.orderId}</strong></div>
            <div style={{ marginTop:8, display:'flex', gap:8 }}>
              <button onClick={()=> window.location.href=`/orders?highlight=${checkoutState.recentOrder.orderId}`} style={{ padding:'8px 10px', borderRadius:8, background:'#fff', color:'#0b69a3' }}>View order</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// pages/order.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import PaymentModal from '../components/PaymentModal'
import ScheduleModal from '../components/ScheduleModal'
import ProductCard from '../components/ProductCard'

export default function OrderPage() {
  const router = useRouter()
  const highlight = router.query.highlight || null

  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(highlight)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(()=> {
    async function load(){
      try {
        const r = await fetch('/api/orders')
        if(!r.ok) throw new Error('failed')
        const data = await r.json()
        setOrders(data || [])
        if(highlight && data.find(o=>o.id===highlight)) setSelected(highlight)
        else if(!selected && data.length) setSelected(data[0].id)
      } catch(err){
        console.error(err)
      }
    }
    load()
  },[highlight])

  useEffect(()=> {
    if(highlight) setSelected(highlight)
  },[highlight])

  function reloadOrders(){ return fetch('/api/orders').then(r=>r.json()).then(setOrders).catch(()=>{}) }

  const selectedOrder = orders.find(o=> o.id === selected) || null

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display:'grid', gridTemplateColumns: '360px 1fr 320px', gap: 20 }}>
        <div className="card" style={{ padding: 12 }}>
          <h3>Orders</h3>
          <div style={{ marginTop: 8 }}>
            <input placeholder="Search orders, buyer, product..." className="input" />
          </div>

          <div style={{ marginTop: 12 }} className="card-list">
            {orders.map(o => (
              <div key={o.id} className={`card-item ${o.id === selected ? 'selected':''}`} onClick={()=>setSelected(o.id)} style={{ cursor:'pointer' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{o.id ? `${o.id.slice(0,6)}...${o.id.slice(-4)}` : 'Buyer'}</div>
                  <div className="meta">{o.region || '—'} • {o.status || '—'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:800 }}>₹ {o.totals?.total?.toLocaleString('en-IN') || 0}</div>
                  <div className="muted" style={{ fontSize:12 }}>{ o.totals?.outstanding ? `Outstanding ₹ ${o.totals.outstanding}` : (o.totals?.paid ? 'Paid' : '')}</div>
                </div>
              </div>
            ))}
            {orders.length===0 && <div className="muted">No orders</div>}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          {selectedOrder ? (
            <>
              <h2 style={{ marginTop:0 }}>{selectedOrder.id ? `${selectedOrder.id.slice(0,6)}...${selectedOrder.id.slice(-4)}` : 'Order'}</h2>
              <div className="muted">Region: {selectedOrder.region} • {selectedOrder.transport?.mode || 'truck'}</div>

              <div style={{ marginTop: 16 }}>
                <h4>Items & batches</h4>
                {selectedOrder.items?.map(it => (
                  <div key={it.productId} className="item-mini">
                    <div>
                      <div style={{ fontWeight:700 }}>{it.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{it.qty} kg • ₹ {it.pricePerKg}/kg</div>
                    </div>
                    <div style={{ fontWeight:700 }}>₹ { (it.qty * it.pricePerKg).toLocaleString('en-IN') }</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <h4>Payments</h4>
                {selectedOrder.payments && selectedOrder.payments.length ? selectedOrder.payments.map(p=>(
                  <div key={p.id} className="payment-card">
                    <div>
                      <div style={{ fontWeight:700 }}>₹ {p.amount}</div>
                      <div className="muted" style={{ fontSize:12 }}>{p.mode} • {new Date(p.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      {p.receipt_url ? <a className="btn ghost" href={p.receipt_url} target="_blank" rel="noreferrer">Receipt</a> : null}
                    </div>
                  </div>
                )) : <div className="muted">No payments yet</div>}
              </div>

              <div style={{ marginTop: 18, display:'flex', gap:8 }}>
                <button className="btn" onClick={() => setShowPaymentModal(true)}>Record Payment</button>
                <button className="btn ghost" onClick={async ()=> {
                  // download invoice
                  try {
                    const r = await fetch(`/api/orders/${selectedOrder.id}/invoice`)
                    if(!r.ok) throw new Error('No invoice')
                    const blob = await r.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `invoice-${selectedOrder.id}.pdf`; document.body.appendChild(a); a.click(); a.remove()
                  } catch(e){ console.error(e); window.enqueueNotification?.('Failed to download invoice',{variant:'error'}) }
                }}>Download Invoice</button>
              </div>
            </>
          ) : (
            <div className="muted">Select an order</div>
          )}
        </div>

        <aside className="card summary">
          <h4>Overview</h4>
          {selectedOrder ? (
            <>
              <div className="row"><div>Subtotal</div><div>₹ {selectedOrder.totals?.subtotal?.toLocaleString('en-IN') || 0}</div></div>
              <div className="row"><div>Paid</div><div>₹ {selectedOrder.totals?.paid?.toLocaleString('en-IN') || 0}</div></div>
              <div className="row"><div>Outstanding</div><div style={{ color: selectedOrder.totals?.outstanding ? 'var(--warning)':'var(--success)'}}>₹ {selectedOrder.totals?.outstanding?.toLocaleString('en-IN') || 0}</div></div>
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={reloadOrders}>Refresh</button>
                <button className="btn ghost" style={{ marginLeft:8 }} onClick={()=> router.push('/create-order') }>Create order</button>
              </div>
            </>
          ) : <div className="muted">No order selected</div>}
        </aside>
      </div>

      {showPaymentModal && selectedOrder && (
        <PaymentModal
          open={showPaymentModal}
          orderId={selectedOrder.id}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => { setShowPaymentModal(false); reloadOrders() }}
        />
      )}
    </div>
  )
}

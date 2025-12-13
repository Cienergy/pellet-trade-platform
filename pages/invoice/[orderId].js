// pages/invoice/[orderId].js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

function formatINR(n){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n) }

export default function InvoicePage(){
  const router = useRouter()
  const { orderId } = router.query
  const [order, setOrder] = useState(null)

  useEffect(()=> {
    if(!orderId) return
    async function load(){
      const res = await fetch('/api/orders')
      const list = await res.json()
      const id = String(orderId)
      const found = (list || []).find(o => (o.order_id === id) || (o.orderId === id) || (o.order_id === decodeURIComponent(id)))
      setOrder(found || null)
    }
    load()
  }, [orderId])

  useEffect(()=> { if(order) setTimeout(()=> window.print(), 600) }, [order])

  if(!order) return <div style={{padding:24}}>Loading invoice...</div>

  const seller = { name:'Cienergy', address:'Industrial Estate, Pune', gstin:'27ABCDE1234F2Z5' }
  const buyer = order.buyer || {}

  return (
    <div style={{fontFamily:'Arial,Helvetica,sans-serif',padding:24,color:'#222',maxWidth:820,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <h2 style={{margin:0,color:'#0b66a3'}}>{seller.name}</h2>
          <div style={{marginTop:6}}>{seller.address}</div>
          <div style={{marginTop:6}}>GSTIN: {seller.gstin}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <h3 style={{margin:0}}>Invoice</h3>
          <div style={{marginTop:6}}><strong>{order.invoice_number || order.invoiceNumber}</strong></div>
          <div style={{marginTop:6}}>Date: {(order.created_at || order.createdAt || '').slice(0,10)}</div>
        </div>
      </div>

      <div style={{marginTop:18,display:'flex',justifyContent:'space-between',padding:12,background:'#fafafa',borderRadius:6}}>
        <div>
          <strong>Bill To</strong>
          <div>{buyer.name}</div>
          <div style={{fontSize:13,color:'#555'}}>{buyer.address || ''}</div>
          <div style={{fontSize:13,color:'#555'}}>GSTIN: {buyer.gstin || '-'}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div><strong>Order ID:</strong> {order.order_id || order.orderId}</div>
          <div style={{marginTop:6}}><strong>Transport:</strong> {order.transport?.transportMethod || '-'} • {Number(order.transport?.transportCharge||0).toFixed(2)}</div>
        </div>
      </div>

      <table style={{width:'100%',marginTop:18,borderCollapse:'collapse'}}>
        <thead><tr style={{background:'#f7fafc'}}><th style={{padding:10,textAlign:'left'}}>#</th><th style={{padding:10,textAlign:'left'}}>Description</th><th style={{padding:10,textAlign:'right'}}>Qty (kg)</th><th style={{padding:10,textAlign:'right'}}>Rate (₹/kg)</th><th style={{padding:10,textAlign:'right'}}>Amount (₹)</th></tr></thead>
        <tbody>
          {(order.items || []).map((it, i)=> (
            <tr key={i} style={{borderBottom:'1px solid #eee'}}>
              <td style={{padding:8}}>{i+1}</td>
              <td style={{padding:8}}>
                <div style={{fontWeight:700}}>{it.name}</div>
                {(it.scheduledBatches||[]).map((b,bi)=> <div key={bi} style={{fontSize:12,color:'#666'}}>Batch: {b.batchNumber} • {b.date} • {b.qty}kg</div>)}
              </td>
              <td style={{padding:8,textAlign:'right'}}>{it.qty}</td>
              <td style={{padding:8,textAlign:'right'}}>{(it.pricePerKg||0).toFixed(2)}</td>
              <td style={{padding:8,textAlign:'right'}}>{(it.lineTotal||0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
        <div style={{width:320}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><div>Subtotal</div><div>{formatINR(order.totals?.subtotal||0)}</div></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><div>Transport</div><div>{formatINR(order.transport?.transportCharge||0)}</div></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><div>GST (12%)</div><div>{formatINR(order.totals?.tax||0)}</div></div>
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,marginTop:8}}><div>Total</div><div>{formatINR(order.totals?.total||0)}</div></div>
        </div>
      </div>

      <h4 style={{marginTop:22}}>Payment Schedule</h4>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{background:'#f7fafc'}}><th style={{padding:8}}>Due Date</th><th style={{padding:8,textAlign:'right'}}>Amount</th><th style={{padding:8}}>Details</th></tr></thead>
        <tbody>
          {(order.payments || []).map((p, idx)=> (
            <tr key={idx}><td style={{padding:8}}>{p.dueDate}</td><td style={{padding:8,textAlign:'right'}}>{formatINR(p.amount)}</td><td style={{padding:8}}>{(p.details||[]).map(d=>`${d.note} (${d.itemId}): ₹${d.amount}`).join('\n')}</td></tr>
          ))}
        </tbody>
      </table>

      <div style={{marginTop:24,fontSize:13,color:'#555'}}>Notes: Please follow payment schedule. Bank details: Bank XYZ, A/C 000011112222, IFSC: ABCD0000</div>
    </div>
  )
}

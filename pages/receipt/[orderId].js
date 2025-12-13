// pages/receipt/[orderId].js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

function formatINR(n){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n) }

export default function ReceiptPage(){
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

  useEffect(()=> { if(order) setTimeout(()=> window.print(), 500) }, [order])

  if(!order) return <div style={{padding:24}}>Loading receipt...</div>

  const paid = (order.payments || []).filter(p => p.status === 'paid' || p.paidAt)
  const seller = { name:'Cienergy', address:'Industrial Estate, Pune', gstin:'27ABCDE1234F2Z5' }
  const buyer = order.buyer || {}

  return (
    <div style={{fontFamily:'Arial,Helvetica,sans-serif',padding:24,color:'#222',maxWidth:720,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2 style={{margin:0}}>{seller.name}</h2>
          <div style={{fontSize:13,color:'#555'}}>{seller.address}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <h4 style={{margin:0}}>Payment Receipt</h4>
          <div style={{marginTop:6}}>Order: {order.order_id || order.orderId}</div>
          <div style={{marginTop:6}}>Invoice: {order.invoice_number || order.invoiceNumber}</div>
        </div>
      </div>

      <div style={{marginTop:12,padding:10,background:'#fafafa',borderRadius:6}}>
        <div><strong>Paid By:</strong> {buyer.name}</div>
        <div style={{fontSize:13,color:'#555'}}>{buyer.address || ''}</div>
      </div>

      <h4 style={{marginTop:18}}>Payments Received</h4>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{background:'#f7fafc'}}><th style={{padding:8}}>Date</th><th style={{padding:8}}>Amount</th><th style={{padding:8}}>Details</th><th style={{padding:8}}>Receipt</th></tr></thead>
        <tbody>
          {paid.length===0 && <tr><td colSpan={4} style={{padding:12}}>No payments marked as paid yet.</td></tr>}
          {paid.map((p,i)=> (
            <tr key={i}>
              <td style={{padding:8}}>{p.paidAt ? p.paidAt.slice(0,10) : p.dueDate}</td>
              <td style={{padding:8,textAlign:'right'}}>{formatINR(p.amount)}</td>
              <td style={{padding:8}}>{(p.details||[]).map(d=>`${d.note} ${d.itemId}`).join(', ')}</td>
              <td style={{padding:8}}>{p.receiptId || `REC-${order.order_id || order.orderId}-${i+1}`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{marginTop:18,fontSize:13,color:'#555'}}>This receipt is computer-generated and does not require signature.</div>
    </div>
  )
}

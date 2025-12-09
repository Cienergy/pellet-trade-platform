import { useEffect, useState } from 'react'
export default function Orders(){
  const [orders,setOrders] = useState([])
  useEffect(()=>{ fetch('/api/orders').then(r=>r.json()).then(setOrders) },[])
  return (
    <div className="container">
      <header className="header">
        <div className="brand"><div className="logo">CIC</div><div><h1>Orders</h1><div className="sub">All placed orders</div></div></div>
        <nav className="nav"><a href="/" className="nav-link">Home</a><a href="/order" className="nav-link">Order</a></nav>
      </header>

      <section className="card">
        <table className="table">
          <thead><tr><th>Order ID</th><th>Date</th><th>Total (INR)</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {orders.slice().reverse().map(o=>(
              <tr key={o.orderId}>
                <td>{o.orderId}</td>
                <td>{o.createdAt?.slice(0,10)}</td>
                <td>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(o.totals?.total || 0)}</td>
                <td>{o.status || 'Placed'}</td>
                <td><button className="btn" onClick={()=> viewOrder(o.orderId)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div id="orderModalRoot"></div>

      <script dangerouslySetInnerHTML={{__html: `
        window.viewOrder = async (orderId) => {
          const resp = await fetch('/api/orders');
          const orders = await resp.json();
          const o = orders.find(x=>x.orderId===orderId);
          if(!o) return alert('Not found');
          // build modal
          const root = document.getElementById('orderModalRoot');
          root.innerHTML = '';
          const div = document.createElement('div');
          div.className = 'modal';
          const itemsHtml = o.items.map((it, idx) => {
            const batches = (it.scheduledBatches||[]).map(b=>\`<div style="font-size:13px;color:#475569">Batch: \${b.batchNumber} • Date: \${b.date} • Qty: \${b.qty}kg</div>\`).join('');
            return \`<tr><td>\${idx+1}</td><td>\${it.name}</td><td>\${it.qty}</td><td>\${new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(it.pricePerKg)}</td><td>\${new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(it.lineTotal|| (it.pricePerKg*it.qty))}</td></tr>\${batches}\`;
          }).join('');
          div.innerHTML = '<div class="modal"><div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><strong>Order '+o.orderId+'</strong><div><button id="downloadInv" class="btn">Download Invoice</button> <button id="closeM" class="btn ghost">Close</button></div></div><div style="margin-top:8px" class="muted">Invoice: '+(o.invoiceNumber||'')+' • Date: '+(o.createdAt?.slice(0,10)||'')+'</div><div style="margin-top:12px"><table class="invoice-table"><thead><tr><th>#</th><th>Description</th><th>Qty(kg)</th><th>Rate/kg</th><th>Line total</th></tr></thead><tbody>'+itemsHtml+'</tbody></table></div><div style="margin-top:12px" class="totals"><div style="display:flex;justify-content:space-between"><div class="muted">Subtotal</div><div>'+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(o.totals.subtotal)+'</div></div><div style="display:flex;justify-content:space-between"><div class="muted">GST (12%)</div><div>'+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(o.totals.tax)+'</div></div><div style="display:flex;justify-content:space-between"><strong>Total</strong><strong>'+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(o.totals.total)+'</strong></div></div></div></div>';
          root.appendChild(div);
          document.getElementById('closeM').onclick = ()=> root.innerHTML = '';
          document.getElementById('downloadInv').onclick = ()=> {
            // client-side invoice generation using jsPDF:
            const docScript = \`
              (function(){ const s = \${JSON.stringify(o)}; const order= s; const jsPDF = window.jspdf.jsPDF; const doc = new jsPDF({unit:'pt',format:'a4'}); let y=40; const left=40; doc.setFontSize(16); doc.setTextColor(11,102,163); doc.text('CIC — Invoice', left, y); y+=22; doc.setFontSize(11); doc.setTextColor(60,64,67); doc.text('Invoice No: '+(order.invoiceNumber||''), left, y); doc.text('Invoice Date: '+(order.createdAt?.slice(0,10)||''), left+300, y); y+=18; doc.setFontSize(10); doc.text('Bill To: Buyer Co', left, y); y+=18; doc.setFontSize(10); doc.text('#', left, y); doc.text('Description', left+40, y); doc.text('Qty(kg)', left+360, y); doc.text('Rate', left+430, y); doc.text('Amount', left+520, y); y+=12; order.items.forEach((it,idx)=>{ doc.text(String(idx+1), left, y); doc.text(it.name, left+40, y); doc.text(String(it.qty), left+360, y); doc.text(String((it.pricePerKg||0).toFixed(2)), left+430, y); const amount = (it.lineTotal || (it.pricePerKg*it.qty)||0); doc.text(String(amount.toFixed(2)), left+520, y); y+=14; (it.scheduledBatches||[]).forEach(b=>{ doc.setFontSize(9); doc.text('Batch: '+b.batchNumber+' • '+b.date+' • '+b.qty+'kg', left+60, y); y+=12; doc.setFontSize(10); }); }); y+=12; doc.text('Subtotal: '+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(order.totals.subtotal), left+360, y); y+=14; doc.text('GST (12%): '+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(order.totals.tax), left+360, y); y+=16; doc.setFontSize(12); doc.text('Total: '+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(order.totals.total), left+360, y); doc.save(order.orderId+'_invoice.pdf'); })();
            \`;
            // execute script in page context (quick and dirty)
            const s = document.createElement('script'); s.innerHTML = docScript; document.body.appendChild(s); document.body.removeChild(s);
          }
        }
      `}} />
    </div>
  )
}

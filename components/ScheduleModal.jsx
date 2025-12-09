import { useState } from 'react'

export default function ScheduleModal({ product, onClose, onSave }){
  const [qty, setQty] = useState(product.minOrderKg)
  const [batches, setBatches] = useState(1)
  const [batchRows, setBatchRows] = useState(() => Array.from({length:1}, (_,i)=>({date: defaultDate(product.leadTimeDays + i*3), qty: Math.floor(product.minOrderKg/1)})))
  const [payOpt, setPayOpt] = useState('full')

  function defaultDate(offsetDays){
    const d = new Date(); d.setDate(d.getDate()+offsetDays); return d.toISOString().slice(0,10)
  }

  function updateBatches(n){
    setBatches(n)
    const rows = Array.from({length:n}, (_,i)=> batchRows[i] || ({date: defaultDate(product.leadTimeDays + i*3), qty: Math.floor(qty/n)}))
    setBatchRows(rows)
  }

  function save(){
    const sum = batchRows.reduce((s,b)=> s + (Number(b.qty)||0), 0)
    if(sum !== Number(qty)) return alert('Sum of batches must equal total qty')
    const payload = { mode: 'scheduled', qty: Number(qty), pricePerKg: product.pricePerKg, name: product.name, scheduledBatches: batchRows, paymentPlan: { type: payOpt } }
    onSave(payload)
  }

  return (
    <div className="modal"><div className="box">
      <div style={{display:'flex',justifyContent:'space-between'}}><strong>Schedule — {product.name}</strong><div><button className="btn ghost" onClick={onClose}>Close</button></div></div>
      <div className="muted small" style={{marginTop:8}}>Min order {product.minOrderKg} kg • Lead time {product.leadTimeDays} days</div>
      <div style={{display:'flex',gap:12,marginTop:12}}>
        <div style={{flex:1}}>
          <label>Total quantity (kg)</label>
          <input type="number" value={qty} onChange={e=> setQty(Number(e.target.value)||0)} />
        </div>
        <div style={{width:160}}>
          <label>Number of batches</label>
          <select value={batches} onChange={e=> updateBatches(Number(e.target.value))}>
            <option>1</option><option>2</option><option>3</option>
          </select>
        </div>
      </div>

      <div style={{marginTop:10}}>
        {batchRows.map((b,i)=>(
          <div key={i} style={{display:'flex',gap:8,marginTop:8}}>
            <input type="date" value={b.date} onChange={e=> { const nr = [...batchRows]; nr[i].date = e.target.value; setBatchRows(nr) }} style={{flex:1}}/>
            <input type="number" value={b.qty} onChange={e=> { const nr = [...batchRows]; nr[i].qty = Number(e.target.value)||0; setBatchRows(nr) }} style={{width:120}}/>
          </div>
        ))}
      </div>

      <div style={{marginTop:12}}>
        <label>Payment option</label>
        <select value={payOpt} onChange={e=>setPayOpt(e.target.value)}><option value="full">Full on delivery</option><option value="deposit">50% deposit, 50% on delivery</option><option value="inst">Installments</option></select>
      </div>

      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button className="btn" onClick={save}>Add to cart</button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  )
}

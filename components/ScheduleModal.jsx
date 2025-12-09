import { useState, useEffect } from 'react'

export default function ScheduleModal({ product, onClose, onSave }){
  const [qty, setQty] = useState(product.minOrderKg)
  const [batches, setBatches] = useState(1)
  const [batchRows, setBatchRows] = useState([])
  const [payOpt, setPayOpt] = useState('full')

  useEffect(()=> {
    // initialize suggested batches (even split) and dates using lead time
    const init = (n=1) => {
      const per = Math.floor(qty / n)
      const remainder = qty - per * n
      const rows = Array.from({length:n}, (_,i) => {
        const d = new Date(); d.setDate(d.getDate() + product.leadTimeDays + i*3) // spaced by 3 days
        return { date: d.toISOString().slice(0,10), qty: per + (i===0 ? remainder : 0) }
      })
      setBatchRows(rows)
    }
    init(batches)
  }, [product, batches, qty])

  function updateBatches(n){
    setBatches(n)
    // will recompute in effect
  }

  function validate(){
    const sum = batchRows.reduce((s,b)=> s + (Number(b.qty)||0), 0)
    if(sum !== Number(qty)) return { ok:false, msg:'Sum of batches must equal total quantity' }
    // ensure dates respect lead time
    for(const b of batchRows){
      const today = new Date()
      const min = new Date(); min.setDate(min.getDate() + product.leadTimeDays)
      const chosen = new Date(b.date)
      if(chosen < min) return { ok:false, msg: `Batch date ${b.date} is before minimum date ${min.toISOString().slice(0,10)}` }
    }
    return { ok:true }
  }

  function save(){
    const v = validate()
    if(!v.ok) return alert(v.msg)
    const payload = { mode:'scheduled', qty: Number(qty), pricePerKg: product.pricePerKg, name: product.name, scheduledBatches: batchRows.map(b=> ({...b}) ), paymentPlan: { type: payOpt } }
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
            <option>1</option><option>2</option><option>3</option><option>4</option>
          </select>
        </div>
      </div>

      <div style={{marginTop:10}}>
        <div className="muted small">Suggested schedule (you can edit quantities & dates)</div>
        {batchRows.map((b,i)=>(
          <div key={i} style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
            <input type="date" value={b.date} onChange={e=> { const nr = [...batchRows]; nr[i].date = e.target.value; setBatchRows(nr) }} style={{flex:1}}/>
            <input type="number" value={b.qty} onChange={e=> { const nr = [...batchRows]; nr[i].qty = Number(e.target.value)||0; setBatchRows(nr) }} style={{width:120}}/>
            <div style={{width:160,fontSize:13,color:'#475569'}}>ETA: {b.date}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:12}}>
        <label>Payment option</label>
        <select value={payOpt} onChange={e=> setPayOpt(e.target.value)}><option value="full">Full on delivery</option><option value="deposit">50% deposit, 50% on delivery</option><option value="inst">Installments</option></select>
      </div>

      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button className="btn" onClick={save}>Add to cart</button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  )
}

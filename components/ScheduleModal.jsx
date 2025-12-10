// components/ScheduleModal.jsx
import { useState, useEffect } from 'react'

export default function ScheduleModal({ product, onClose, onSave }) {
  const [qty, setQty] = useState(product.minOrderKg)
  const [batches, setBatches] = useState(1)
  const [batchRows, setBatchRows] = useState([])

  const [payOpt, setPayOpt] = useState('full') // full | deposit | inst
  const [depositPct, setDepositPct] = useState(50)
  const [instCount, setInstCount] = useState(3)
  const [firstPaymentOffsetDays, setFirstPaymentOffsetDays] = useState(0)

  // --------------------------------------------
  // INIT BATCHES
  // --------------------------------------------
  useEffect(() => {
    const init = (n = 1) => {
      const per = Math.floor(qty / n)
      const rem = qty - per * n
      const arr = Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + product.leadTimeDays + i * 3)
        return {
          date: d.toISOString().slice(0, 10),
          qty: per + (i === 0 ? rem : 0)
        }
      })
      setBatchRows(arr)
    }
    init(batches)
  }, [qty, batches, product])

  // --------------------------------------------
  // VALIDATE INPUTS
  // --------------------------------------------
  function validate() {
    const sum = batchRows.reduce((s, b) => s + Number(b.qty || 0), 0)
    if (sum !== qty) return { ok: false, msg: "Sum of batches must equal total qty" }

    for (const b of batchRows) {
      const min = new Date()
      min.setDate(min.getDate() + product.leadTimeDays)
      const chosen = new Date(b.date)
      if (chosen < min) {
        return {
          ok: false,
          msg: `Batch date ${b.date} is earlier than minimum allowed ${min.toISOString().slice(0, 10)}`
        }
      }
    }

    if (payOpt === 'deposit' && (depositPct <= 0 || depositPct >= 100)) {
      return { ok: false, msg: "Deposit % must be between 1 and 99" }
    }

    if (payOpt === 'inst' && instCount < 2) {
      return { ok: false, msg: "Installments must be 2 or more" }
    }

    return { ok: true }
  }

  // --------------------------------------------
  // SAVE PAYLOAD TO CART (server computes final amounts)
  // --------------------------------------------
  function save() {
    const v = validate()
    if (!v.ok) return alert(v.msg)

    const paymentPlan = {
      type: payOpt,
      depositPct,
      instCount,
      firstPaymentOffsetDays
    }

    const payload = {
      mode: 'scheduled',
      qty: Number(qty),
      pricePerKg: product.pricePerKg,
      name: product.name,
      scheduledBatches: batchRows.map((b) => ({ ...b })),
      paymentPlan
    }

    onSave(payload)
  }

  // --------------------------------------------
  // UI
  // --------------------------------------------
  return (
    <div className="modal">
      <div className="box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #e5e7eb" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Schedule — {product.name}</h3>
            <div className="muted small" style={{ marginTop: "0.5rem" }}>
              Min order {product.minOrderKg} kg • Lead time {product.leadTimeDays} days
            </div>
          </div>
          <button className="btn ghost" onClick={onClose} style={{ padding: "0.5rem 1rem" }}>Close</button>
        </div>

        {/* Quantity + Batches */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ flex: 1 }}>
            <label>Total quantity (kg)</label>
            <input type="number" value={qty} onChange={e => setQty(Number(e.target.value) || 0)} />
          </div>

          <div style={{ width: "180px" }}>
            <label># Batches</label>
            <select value={batches} onChange={e => setBatches(Number(e.target.value))}>
              <option>1</option><option>2</option><option>3</option><option>4</option>
            </select>
          </div>
        </div>

        {/* Batch rows */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ marginBottom: "0.75rem", display: "block" }}>Suggested schedule (editable)</label>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.75rem", background: "#f9fafb" }}>
            {batchRows.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", alignItems: "center" }}>
                <input
                  type="date"
                  value={b.date}
                  onChange={e => {
                    const nr = [...batchRows]
                    nr[i].date = e.target.value
                    setBatchRows(nr)
                  }}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={b.qty}
                  onChange={e => {
                    const nr = [...batchRows]
                    nr[i].qty = Number(e.target.value) || 0
                    setBatchRows(nr)
                  }}
                  style={{ width: "120px" }}
                  placeholder="Qty (kg)"
                />
                <div className="small" style={{ width: "140px", fontWeight: 600, color: "#0b66a3" }}>📅 ETA: {b.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label>Payment option</label>
          <select value={payOpt} onChange={e => setPayOpt(e.target.value)}>
            <option value="full">Full on delivery</option>
            <option value="deposit">Deposit</option>
            <option value="inst">Installments</option>
          </select>
        </div>

        {payOpt === 'deposit' && (
          <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.75rem", border: "1px solid #e5e7eb" }}>
            <div style={{ flex: 1 }}>
              <label>Deposit %</label>
              <input type="number" value={depositPct} onChange={e => setDepositPct(Number(e.target.value))} min="1" max="99" />
            </div>
            <div style={{ width: "200px" }}>
              <label>First payment offset (days)</label>
              <input type="number" value={firstPaymentOffsetDays} onChange={e => setFirstPaymentOffsetDays(Number(e.target.value))} min="0" />
            </div>
          </div>
        )}

        {payOpt === 'inst' && (
          <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.75rem", border: "1px solid #e5e7eb" }}>
            <div style={{ flex: 1 }}>
              <label># Installments</label>
              <input type="number" value={instCount} onChange={e => setInstCount(Number(e.target.value))} min="2" />
            </div>
            <div style={{ width: "200px" }}>
              <label>First payment offset (days)</label>
              <input type="number" value={firstPaymentOffsetDays} onChange={e => setFirstPaymentOffsetDays(Number(e.target.value))} min="0" />
            </div>
          </div>
        )}

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "2px solid #e5e7eb", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose} style={{ padding: "0.75rem 1.5rem" }}>Cancel</button>
          <button className="btn" onClick={save} style={{ padding: "0.75rem 1.5rem" }}>Add to cart</button>
        </div>
      </div>
    </div>
  )
}

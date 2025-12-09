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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>Schedule — {product.name}</strong>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>

        <div className="muted small" style={{ marginTop: 8 }}>
          Min order {product.minOrderKg} kg • Lead time {product.leadTimeDays} days
        </div>

        {/* Quantity + Batches */}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Total quantity (kg)</label>
            <input type="number" value={qty} onChange={e => setQty(Number(e.target.value) || 0)} />
          </div>

          <div style={{ width: 160 }}>
            <label># Batches</label>
            <select value={batches} onChange={e => setBatches(Number(e.target.value))}>
              <option>1</option><option>2</option><option>3</option><option>4</option>
            </select>
          </div>
        </div>

        {/* Batch rows */}
        <div style={{ marginTop: 10 }}>
          <div className="muted small">Suggested schedule (editable)</div>
          {batchRows.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
                style={{ width: 120 }}
              />
              <div className="small" style={{ width: 120 }}>ETA: {b.date}</div>
            </div>
          ))}
        </div>

        {/* Payment method */}
        <div style={{ marginTop: 12 }}>
          <label>Payment option</label>
          <select value={payOpt} onChange={e => setPayOpt(e.target.value)}>
            <option value="full">Full on delivery</option>
            <option value="deposit">Deposit</option>
            <option value="inst">Installments</option>
          </select>
        </div>

        {payOpt === 'deposit' && (
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Deposit %</label>
              <input type="number" value={depositPct} onChange={e => setDepositPct(Number(e.target.value))} />
            </div>
            <div style={{ width: 160 }}>
              <label>First payment offset (days)</label>
              <input type="number" value={firstPaymentOffsetDays} onChange={e => setFirstPaymentOffsetDays(Number(e.target.value))} />
            </div>
          </div>
        )}

        {payOpt === 'inst' && (
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label># Installments</label>
              <input type="number" value={instCount} onChange={e => setInstCount(Number(e.target.value))} />
            </div>
            <div style={{ width: 160 }}>
              <label>First payment offset (days)</label>
              <input type="number" value={firstPaymentOffsetDays} onChange={e => setFirstPaymentOffsetDays(Number(e.target.value))} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button className="btn" onClick={save}>Add to cart</button>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

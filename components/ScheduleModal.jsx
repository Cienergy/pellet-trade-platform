// components/ScheduleModal.jsx
import React from 'react';

export default function ScheduleModal({ product, onClose, onSave }) {
  const [entries, setEntries] = React.useState(() => {
    const defaultQty = product?.minOrderKg || 500;
    return [{ id: 1, date: new Date(Date.now() + (product?.leadTimeDays || 7) * 86400000).toISOString().slice(0,10), qty: defaultQty }];
  });

  React.useEffect(() => {
    // index reset if product changes
    setEntries(prev => prev.map(e => ({ ...e })));
  }, [product?.productId]);

  if (!product) return null;

  function updateEntry(idx, key, value) {
    setEntries(prev => prev.map(e => e.id === idx ? { ...e, [key]: value } : e));
  }
  function addEntry() {
    setEntries(prev => [...prev, { id: Date.now(), date: new Date().toISOString().slice(0,10), qty: product.minOrderKg || 500 }]);
  }
  function removeEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function handleSave() {
    // compute total qty
    const totalQty = entries.reduce((s,e)=> s + Number(e.qty || 0), 0);
    const scheduledBatches = entries.map(e => ({ date: e.date, qty: Number(e.qty || 0) }));
    onSave({
      productId: product.productId,
      name: product.name,
      pricePerKg: product.pricePerKg,
      qty: totalQty,
      scheduledBatches
    });
    onClose();
  }

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(2,6,23,0.25)', zIndex:999 }}>
      <div style={{ width:700, background:'#fff', borderRadius:10, padding:20 }}>
        <h3 style={{ marginTop:0 }}>{product.name} — Schedule deliveries</h3>

        <div style={{ display:'flex', gap:12, flexDirection:'column', maxHeight:420, overflowY:'auto' }}>
          {entries.map(e => (
            <div key={e.id} style={{ display:'flex', gap:8, alignItems:'center', padding:8, border:'1px solid #eef2f5', borderRadius:8 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:12, color:'#374151' }}>Date</label>
                <input type="date" value={e.date} onChange={ev => updateEntry(e.id, 'date', ev.target.value)} className="input" />
              </div>
              <div style={{ width:140 }}>
                <label style={{ fontSize:12, color:'#374151' }}>Qty (kg)</label>
                <input type="number" value={e.qty} onChange={ev => updateEntry(e.id, 'qty', Number(ev.target.value))} className="input" />
              </div>
              <div>
                <button onClick={() => removeEntry(e.id)} style={{ padding:'8px 10px', borderRadius:8 }}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', marginTop:12 }}>
          <button onClick={addEntry} style={{ padding:'8px 12px', borderRadius:8, background:'#fff', border:'1px solid #d1d5db' }}>Add split</button>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ padding:'8px 12px', borderRadius:8 }}>Cancel</button>
            <button onClick={handleSave} style={{ padding:'8px 12px', borderRadius:8, background:'#0b69a3', color:'#fff' }}>Save schedule</button>
          </div>
        </div>
      </div>
    </div>
  );
}

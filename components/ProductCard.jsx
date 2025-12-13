// components/ProductCard.jsx
import React from 'react';

export default function ProductCard({ product, region, onAdd, onSchedule }) {
  // product expected shape from /api/products:
  // { productId, name, feedstock, pricePerKg, minOrderKg, leadTimeDays, stockByRegion }

  const regionKey = (region || '').toLowerCase();
  const stock = Number(product.stockByRegion?.[regionKey] ?? 0);

  const payloadForAdd = {
    productId: product.productId,
    name: product.name,
    pricePerKg: product.pricePerKg,
    minOrderKg: product.minOrderKg,
    feedstock: product.feedstock,
    leadTimeDays: product.leadTimeDays,
    stockByRegion: product.stockByRegion
  };

  const payloadForSchedule = {
    productId: product.productId,
    name: product.name,
    pricePerKg: product.pricePerKg,
    minOrderKg: product.minOrderKg,
    leadTimeDays: product.leadTimeDays
  };

  return (
    <div style={{
      padding:12,
      border:'1px solid #f3f4f6',
      borderRadius:10,
      display:'flex',
      justifyContent:'space-between',
      alignItems:'center',
      background:'#fff'
    }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:15 }}>{product.name}</div>
        <div style={{ color:'#6b7280', marginTop:4 }}>{product.feedstock}</div>
        <div style={{ marginTop:10, fontWeight:800 }}>₹ {Number(product.pricePerKg).toFixed(2)}/kg</div>
        <div style={{ color:'#6b7280', fontSize:13, marginTop:6 }}>
          {stock > 0 ? `In-region: ${stock} kg` : `Lead time: ${product.leadTimeDays} days`}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginLeft:12 }}>
        <button
          onClick={() => onAdd(payloadForAdd)}
          style={{ background:'#0b69a3', color:'#fff', border:0, padding:'8px 12px', borderRadius:8 }}>
          Add
        </button>

        <button
          onClick={() => onSchedule(payloadForSchedule)}
          style={{ background:'#fff', color:'#0b69a3', border:'1px solid #0b69a3', padding:'6px 10px', borderRadius:8 }}>
          Schedule
        </button>
      </div>
    </div>
  );
}

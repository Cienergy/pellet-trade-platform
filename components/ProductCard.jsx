export default function ProductCard({ product, region, onAdd, onSchedule }){
    const stock = product.stockByRegion?.[region] || 0
    return (
      <div className="card product">
        <div style={{display:'flex',justifyContent:'space-between',gap:'1.5rem',alignItems:'flex-start'}}>
          <div style={{flex:1}}>
            <div style={{display:'flex',gap:'0.75rem',alignItems:'center',marginBottom:'0.5rem',flexWrap:'wrap'}}>
              <span className="badge">{product.feedstock}</span>
              <strong style={{fontSize:'1.125rem',color:'#111827'}}>{product.name}</strong>
            </div>
            <div className="small" style={{marginTop:'0.25rem',lineHeight:1.6}}>
              Supplier: <strong>{product.supplier}</strong> • Moisture: {product.moisture}% • {product.calorific} kcal/kg
            </div>
          </div>
          <div style={{textAlign:'right',minWidth:'200px'}}>
            <div style={{fontWeight:800,fontSize:'1.5rem',color:'#0b66a3',marginBottom:'0.25rem'}}>
              {new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(product.pricePerKg)}/kg
            </div>
            <div className="small" style={{marginBottom:'0.5rem'}}>Min: {product.minOrderKg} kg</div>
            <div style={{marginBottom:'1rem'}}>
              {stock>0 ? (
                <div style={{color:'#10b981',fontWeight:600}} className="small">✓ In stock • {stock} kg</div>
              ) : (
                <div style={{color:'#f59e0b',fontWeight:600}} className="small">⏱ Lead time: {product.leadTimeDays} days</div>
              )}
            </div>
            <div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
              <button className="btn" onClick={onAdd} style={{padding:'0.5rem 1rem',fontSize:'0.875rem'}}>Add</button>
              <button className="btn ghost" onClick={onSchedule} style={{padding:'0.5rem 1rem',fontSize:'0.875rem'}}>Schedule</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
export default function ProductCard({ product, region, onAdd, onSchedule }){
    const stock = product.stockByRegion?.[region] || 0
    return (
      <div className="card product">
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}><span className="badge">{product.feedstock}</span><strong>{product.name}</strong></div>
            <div className="small">Supplier: {product.supplier} • Moisture: {product.moisture}% • {product.calorific} kcal/kg</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700}}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(product.pricePerKg)}/kg</div>
            <div className="small">Min: {product.minOrderKg} kg</div>
            <div style={{marginTop:8}}>{stock>0 ? <div style={{color:'#0b5a30'}} className="small">In stock • {stock} kg</div> : <div style={{color:'#a66300'}} className="small">Lead time: {product.leadTimeDays} days</div>}</div>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={onAdd}>Add</button>
              <button className="btn ghost" style={{marginLeft:8}} onClick={onSchedule}>Schedule</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
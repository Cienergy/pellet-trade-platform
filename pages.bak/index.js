import Link from 'next/link'

export default function Home(){
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo">CIC</div>
          <div>
            <h1>Pellet Trade Platform</h1>
            <div className="sub">Buy pellets — Napier & other feedstocks. INR pricing • Scheduling • Invoices</div>
          </div>
        </div>

        <nav className="nav">
          <Link href="/order"><button className="btn">Start Order</button></Link>
          <Link href="/orders"><button className="btn ghost">Orders</button></Link>
        </nav>
      </header>

      <main style={{marginTop:'2rem'}}>
        <section className="card" style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:'2rem',alignItems:'center',background:'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'}}>
          <div>
            <h2 style={{marginTop:0,marginBottom:'1rem',fontSize:'2rem',fontWeight:800,lineHeight:1.2,color:'#111827'}}>
              Fast, reliable biomass pellets — delivered on schedule
            </h2>
            <p className="muted" style={{fontSize:'1.0625rem',lineHeight:1.7,marginBottom:'1.5rem'}}>
              Find pellets available now in your region, or schedule production in advance. Auto-generated batch numbers, invoice PDF, transport calculation and payment scheduling — everything you need for trade.
            </p>

            <ul style={{marginTop:'1.5rem',marginBottom:'1.5rem',paddingLeft:'1.5rem',listStyle:'none'}}>
              <li className="small" style={{marginBottom:'0.75rem',position:'relative',paddingLeft:'1.5rem'}}>
                <span style={{position:'absolute',left:0,color:'#0b66a3'}}>✓</span>
                Region-based availability & lead-time filtering
              </li>
              <li className="small" style={{marginBottom:'0.75rem',position:'relative',paddingLeft:'1.5rem'}}>
                <span style={{position:'absolute',left:0,color:'#0b66a3'}}>✓</span>
                Smart scheduling with per-batch ETA
              </li>
              <li className="small" style={{marginBottom:'0.75rem',position:'relative',paddingLeft:'1.5rem'}}>
                <span style={{position:'absolute',left:0,color:'#0b66a3'}}>✓</span>
                Transport & tax calculation in INR
              </li>
              <li className="small" style={{marginBottom:'0.75rem',position:'relative',paddingLeft:'1.5rem'}}>
                <span style={{position:'absolute',left:0,color:'#0b66a3'}}>✓</span>
                Server-generated invoice PDF (downloadable)
              </li>
            </ul>

            <div style={{marginTop:'2rem',display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
              <Link href="/order"><button className="btn" style={{padding:'0.75rem 1.5rem',fontSize:'1rem'}}>Create an order</button></Link>
              <Link href="/orders"><button className="btn ghost" style={{padding:'0.75rem 1.5rem',fontSize:'1rem'}}>View orders</button></Link>
            </div>
          </div>

          <aside className="card" style={{textAlign:'center',background:'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',border:'2px solid #bfdbfe'}}>
            <div style={{fontSize:'3rem',color:'#0b66a3',fontWeight:800,marginBottom:'0.5rem',letterSpacing:'-0.02em'}}>Cienergy</div>
            <div className="muted" style={{marginTop:'0.5rem',fontWeight:600}}>Supplier: Cienergy (all inventory)</div>
            <div style={{marginTop:'1.5rem',paddingTop:'1.5rem',borderTop:'2px solid #bfdbfe'}}>
              <strong style={{display:'block',marginBottom:'0.5rem',color:'#111827'}}>Contact</strong>
              <div className="small" style={{fontSize:'0.875rem'}}>sales@cienergy.co</div>
              <div className="small" style={{fontSize:'0.875rem',marginTop:'0.25rem'}}>+91-XXXXXXXXXX</div>
            </div>
          </aside>
        </section>

        <section style={{marginTop:'1.5rem'}} className="card">
          <h3 style={{marginTop:0,marginBottom:'1rem',fontSize:'1.5rem',fontWeight:700}}>Quick demo</h3>
          <p className="muted" style={{fontSize:'1rem',lineHeight:1.7}}>
            Use <strong style={{color:'#111827'}}>Order Pellets</strong> to browse products, add immediate or scheduled items, supply transport details, and checkout. After placing the order you can download the server-generated invoice.
          </p>
        </section>
      </main>
    </div>
  )
}

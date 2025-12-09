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

      <main style={{marginTop:20}}>
        <section className="card" style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:18,alignItems:'center'}}>
          <div>
            <h2 style={{marginTop:0}}>Fast, reliable biomass pellets — delivered on schedule</h2>
            <p className="muted">Find pellets available now in your region, or schedule production in advance. Auto-generated batch numbers, invoice PDF, transport calculation and payment scheduling — everything you need for trade.</p>

            <ul style={{marginTop:12}}>
              <li className="small">Region-based availability & lead-time filtering</li>
              <li className="small">Smart scheduling with per-batch ETA</li>
              <li className="small">Transport & tax calculation in INR</li>
              <li className="small">Server-generated invoice PDF (downloadable)</li>
            </ul>

            <div style={{marginTop:16}}>
              <Link href="/order"><button className="btn">Create an order</button></Link>
              <Link href="/orders"><button className="btn ghost" style={{marginLeft:10}}>View orders</button></Link>
            </div>
          </div>

          <aside className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:48, color:'#0b66a3', fontWeight:700}}>Cienergy</div>
            <div className="muted" style={{marginTop:8}}>Supplier: Cienergy (all inventory)</div>
            <div style={{marginTop:12}}>
              <strong>Contact</strong>
              <div className="small">sales@cienergy.co · +91-XXXXXXXXXX</div>
            </div>
          </aside>
        </section>

        <section style={{marginTop:18}} className="card">
          <h3 style={{marginTop:0}}>Quick demo</h3>
          <p className="muted">Use <strong>Order Pellets</strong> to browse products, add immediate or scheduled items, supply transport details, and checkout. After placing the order you can download the server-generated invoice.</p>
        </section>
      </main>
    </div>
  )
}

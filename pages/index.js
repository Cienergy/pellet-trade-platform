import Link from 'next/link'
export default function Home(){
  return (
    <div className="container">
      <header className="header">
        <div className="brand"><div className="logo">CIC</div><div>
          <h1>Pellet Buyer Portal</h1>
          <div className="sub">INR pricing • Napier & feedstocks • Scheduling • Invoice</div>
        </div></div>
        <nav className="nav">
          <Link href="/order"><button className="btn">Start Order</button></Link>
        </nav>
      </header>

      <main style={{marginTop:20}}>
        <section className="card">
          <h2>Welcome</h2>
          <p className="muted">This demo shows a production-style buyer flow: region and lead-time filters, immediate and scheduled ordering, auto-generated batch numbers, and invoice PDF generation. Deploy to Vercel for a shareable demo link.</p>
          <div style={{marginTop:12, display:'flex', gap:10}}>
            <Link href="/order"><button className="btn">Order Pellets</button></Link>
            <Link href="/orders"><button className="btn ghost">View Orders</button></Link>
          </div>
        </section>
      </main>
    </div>
  )
}

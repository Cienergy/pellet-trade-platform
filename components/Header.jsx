import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Header(){
  const router = useRouter()
  const active = (p) => router.pathname === p ? 'active' : ''

  return (
    <header className="header">
      <div className="brand">
        <div className="logo">CIC</div>
        <div>
          <h1 style={{margin:0,fontSize:'1.5rem',fontWeight:800}}>Pellet Trade Platform</h1>
          <div className="sub">INR • Scheduling • Invoices • Cienergy</div>
        </div>
      </div>

      <nav className="nav">
        <Link href="/"><button className={`nav-btn ${active('/')}`}>Home</button></Link>
        <Link href="/order"><button className={`nav-btn ${active('/order')}`}>Order</button></Link>
        <Link href="/orders"><button className={`nav-btn ${active('/orders')}`}>Orders</button></Link>
      </nav>
    </header>
  )
}

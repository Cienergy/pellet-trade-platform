// components/Sidebar.jsx
import Link from "next/link";
import { useRouter } from "next/router";

export default function Sidebar() {
  const router = useRouter();

  const isActive = (path) => router.pathname === path;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/cienergy-logo.png" alt="Cienergy Logo" />
        <div className="brand-title">Cienergy</div>
      </div>

      <nav>
        <Link href="/">
          <div className={isActive("/") ? "nav-link active" : "nav-link"}>Home</div>
        </Link>

        <Link href="/order">
          <div className={isActive("/order") ? "nav-link active" : "nav-link"}>Create Order</div>
        </Link>

        <Link href="/orders">
          <div className={isActive("/orders") ? "nav-link active" : "nav-link"}>Orders</div>
        </Link>
      </nav>

      <style jsx>{`
        .sidebar {
          width: 260px;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          padding: 20px;
          background: #fff;
          border-right: 1px solid #eee;
        }
        .brand { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
        .brand img { width:46px; height:auto; }
        .brand-title { font-weight:700; color:#0b66a3; }
        nav { display:flex; flex-direction:column; gap:8px; }
        .nav-link {
          padding:10px 12px;
          border-radius:8px;
          cursor:pointer;
          color:#0f172a;
        }
        .nav-link:hover { background:#f3f4f6; }
        .nav-link.active { background:#e6f0ff; border-left:3px solid #0b66a3; padding-left:9px; }
      `}</style>
    </aside>
  );
}

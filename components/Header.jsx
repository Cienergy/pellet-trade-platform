import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
  const { pathname } = useRouter();

  const nav = [
    { href: "/", label: "Home" },
    { href: "/create-order", label: "Create Order" },
    { href: "/orders", label: "Orders" },
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <img src="/cienergy-logo.png" alt="Cienergy" />
          <span>Cienergy</span>
        </div>

        <nav className="nav">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link ${
                pathname === n.href ? "active" : ""
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="platform">Pellet Trade Platform</div>
      </div>
    </header>
  );
}

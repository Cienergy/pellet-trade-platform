import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

export default function BuyerLayout({ children, title }) {
  const router = useRouter();

  const navItems = [
    { href: "/buyer/dashboard", label: "Dashboard" },
    { href: "/buyer/catalog", label: "Catalog" },
    { href: "/buyer/orders", label: "My Orders" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/buyer/dashboard" className="flex items-center gap-3">
                <Image src="/cienergy-logo.png" alt="Cienergy" width={120} height={36} className="object-contain" />
                <span className="text-sm font-semibold text-slate-700 border-l pl-3 hidden lg:inline">
                  Customer Portal
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#0b69a3] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <form method="POST" action="/api/auth/logout">
              <button className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium">
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#0b69a3] text-white"
                    : "text-slate-600 bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {title}
            </h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

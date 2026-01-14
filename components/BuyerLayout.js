import Link from "next/link";

export default function BuyerLayout({ user, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r px-6 py-8">
        <div className="text-xl font-semibold mb-10">
          Pellet Platform
        </div>

        <nav className="space-y-4">
          <Link href="/buyer/dashboard" className="block text-gray-700 hover:text-black">
            Dashboard
          </Link>
          <Link href="/buyer/catalog" className="block text-gray-700 hover:text-black">
            Product Catalog
          </Link>
          <Link href="/buyer/orders" className="block text-gray-700 hover:text-black">
            My Orders
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Top bar */}
        <div className="h-16 bg-white border-b px-8 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Buyer
          </div>

          <form method="POST" action="/api/auth/logout">
            <button className="text-sm px-4 py-2 rounded bg-black text-white">
              Logout
            </button>
          </form>
        </div>

        {/* Page content */}
        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
}

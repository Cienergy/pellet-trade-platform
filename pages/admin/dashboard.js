import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard", { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-red-600">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <form method="POST" action="/api/auth/logout">
            <button className="px-4 py-2 bg-black text-white rounded">
              Logout
            </button>
          </form>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard label="Active Users" value={stats.users} />
          <StatCard label="Products" value={stats.products} />
          <StatCard label="Sites" value={stats.sites} />
          <StatCard
            label="Total Inventory"
            value={`${stats.totalInventoryMT.toFixed(1)} MT`}
          />
          <StatCard label="Total Orders" value={stats.orders} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            title="Manage Users"
            description="Create and manage user accounts"
            href="/admin/users"
          />
          <ActionCard
            title="Manage Products"
            description="Add and update products"
            href="/admin/products"
          />
          <ActionCard
            title="Manage Sites"
            description="Configure factory sites"
            href="/admin/sites"
          />
          <ActionCard
            title="Manage Inventory"
            description="Update inventory levels"
            href="/admin/inventory"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}

function ActionCard({ title, description, href }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}


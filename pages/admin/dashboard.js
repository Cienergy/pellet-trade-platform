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

  const maxValue = Math.max(stats.users, stats.products, stats.sites, stats.orders, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">System overview and management</p>
          </div>
          <form method="POST" action="/api/auth/logout">
            <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition">
              Logout
            </button>
          </form>
        </div>

        {/* KPIs with Visualizations */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard 
            label="Active Users" 
            value={stats.users} 
            max={maxValue}
            color="from-blue-500 to-blue-600"
          />
          <StatCard 
            label="Products" 
            value={stats.products} 
            max={maxValue}
            color="from-green-500 to-green-600"
          />
          <StatCard 
            label="Sites" 
            value={stats.sites} 
            max={maxValue}
            color="from-purple-500 to-purple-600"
          />
          <StatCard
            label="Total Inventory"
            value={`${stats.totalInventoryMT.toFixed(1)} MT`}
            max={maxValue}
            color="from-orange-500 to-orange-600"
            isText={true}
          />
          <StatCard 
            label="Total Orders" 
            value={stats.orders} 
            max={maxValue}
            color="from-indigo-500 to-indigo-600"
          />
        </div>

        {/* Visualization Section */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
          <div className="space-y-4">
            <BarChart 
              label="Users" 
              value={stats.users} 
              max={maxValue}
              color="bg-blue-500"
            />
            <BarChart 
              label="Products" 
              value={stats.products} 
              max={maxValue}
              color="bg-green-500"
            />
            <BarChart 
              label="Sites" 
              value={stats.sites} 
              max={maxValue}
              color="bg-purple-500"
            />
            <BarChart 
              label="Orders" 
              value={stats.orders} 
              max={maxValue}
              color="bg-indigo-500"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            title="Manage Users"
            description="Create and manage user accounts"
            href="/admin/users"
            icon="👥"
          />
          <ActionCard
            title="Manage Products"
            description="Add and update products"
            href="/admin/products"
            icon="📦"
          />
          <ActionCard
            title="Manage Sites"
            description="Configure factory sites"
            href="/admin/sites"
            icon="🏭"
          />
          <ActionCard
            title="Manage Inventory"
            description="Update inventory levels"
            href="/ops/inventory"
            icon="📊"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, max, color, isText = false }) {
  const percentage = isText ? 0 : (value / max) * 100;
  
  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-bold mb-3">{value}</div>
      {!isText && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

function BarChart({ label, value, max, color }) {
  const percentage = (value / max) * 100;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, icon }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-6 hover:shadow-lg transition-all hover:scale-105"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}

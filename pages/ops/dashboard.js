import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function OpsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/dashboard", { credentials: "include" })
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  const totalOrders = stats.pendingOrders + stats.inProgressOrders;
  const pendingPercentage = totalOrders > 0 ? (stats.pendingOrders / totalOrders) * 100 : 0;
  const inProgressPercentage = totalOrders > 0 ? (stats.inProgressOrders / totalOrders) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Operations Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Order and inventory management</p>
            </div>
            <form method="POST" action="/api/auth/logout">
              <button className="px-6 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium">
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumStatCard
            label="Pending Orders"
            value={stats.pendingOrders}
            icon="⏳"
            color="from-yellow-500 to-amber-500"
            highlight={stats.pendingOrders > 0}
          />
          <PremiumStatCard
            label="In Progress"
            value={stats.inProgressOrders}
            icon="⚙️"
            color="from-blue-500 to-indigo-500"
          />
          <PremiumStatCard
            label="Pending Batches"
            value={stats.pendingBatches}
            icon="📦"
            color="from-purple-500 to-pink-500"
            highlight={stats.pendingBatches > 0}
          />
          <PremiumStatCard
            label="Inventory Updates (7d)"
            value={stats.inventoryUpdates}
            icon="📊"
            color="from-green-500 to-emerald-500"
          />
        </div>

        {/* Order Status Visualization */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl">
              📊
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Status Distribution</h2>
              <p className="text-sm text-gray-500">Current order pipeline</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Pending Orders</span>
                <span className="text-xl font-bold text-yellow-600">{stats.pendingOrders}</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${pendingPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {pendingPercentage.toFixed(1)}% of active orders
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">In Progress</span>
                <span className="text-xl font-bold text-blue-600">{stats.inProgressOrders}</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${inProgressPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {inProgressPercentage.toFixed(1)}% of active orders
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PremiumActionCard
            title="Manage Orders"
            description="View and batch orders"
            href="/ops/orders"
            icon="📋"
            color="from-indigo-500 to-purple-500"
          />
          <PremiumActionCard
            title="Update Inventory"
            description="Update inventory levels by site"
            href="/ops/inventory"
            icon="📊"
            color="from-green-500 to-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}

function PremiumStatCard({ label, value, icon, color, highlight = false }) {
  return (
    <div className={`bg-white/80 backdrop-blur-md rounded-2xl border ${highlight ? "border-orange-300 shadow-lg" : "border-gray-200"} shadow-lg hover:shadow-xl transition-all duration-300 p-6 group ${highlight ? "bg-gradient-to-br from-orange-50 to-amber-50" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {highlight && (
          <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
        )}
      </div>
      <div className={`text-sm ${highlight ? "text-orange-700 font-semibold" : "text-gray-600"} mb-1`}>{label}</div>
      <div className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        {value}
      </div>
    </div>
  );
}

function PremiumActionCard({ title, description, href, icon, color }) {
  return (
    <Link
      href={href}
      className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-8 group hover:scale-105"
    >
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex items-center text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
        <span>Go to {title}</span>
        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

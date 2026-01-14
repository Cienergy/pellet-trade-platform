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

  const totalOrders = stats.pendingOrders + stats.inProgressOrders;
  const maxValue = Math.max(totalOrders, stats.pendingBatches, stats.inventoryUpdates, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Operations Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Order and inventory management</p>
          </div>
          <form method="POST" action="/api/auth/logout">
            <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition">
              Logout
            </button>
          </form>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Pending Orders"
            value={stats.pendingOrders}
            highlight={stats.pendingOrders > 0}
            max={maxValue}
            color="from-yellow-500 to-orange-500"
          />
          <StatCard
            label="In Progress"
            value={stats.inProgressOrders}
            max={maxValue}
            color="from-blue-500 to-indigo-500"
          />
          <StatCard
            label="Pending Batches"
            value={stats.pendingBatches}
            highlight={stats.pendingBatches > 0}
            max={maxValue}
            color="from-purple-500 to-pink-500"
          />
          <StatCard
            label="Inventory Updates (7d)"
            value={stats.inventoryUpdates}
            max={maxValue}
            color="from-green-500 to-emerald-500"
          />
        </div>

        {/* Order Status Visualization */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Order Status Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Pending Orders</span>
                <span className="text-sm font-bold">{stats.pendingOrders}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                  style={{ width: `${totalOrders > 0 ? (stats.pendingOrders / totalOrders) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">In Progress</span>
                <span className="text-sm font-bold">{stats.inProgressOrders}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width: `${totalOrders > 0 ? (stats.inProgressOrders / totalOrders) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            title="Manage Orders"
            description="View and batch orders"
            href="/ops/orders"
            icon="📋"
          />
          <ActionCard
            title="Update Inventory"
            description="Update inventory levels by site"
            href="/ops/inventory"
            icon="📊"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false, max, color }) {
  const percentage = (value / max) * 100;
  
  return (
    <div
      className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all ${
        highlight ? "border-orange-400 bg-orange-50" : ""
      }`}
    >
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className={`text-3xl font-bold mb-3 ${highlight ? "text-orange-600" : ""}`}>
        {value}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${color}`}
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

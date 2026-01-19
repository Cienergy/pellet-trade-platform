import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ClockIcon, SettingsIcon, PackageIcon, ChartIcon, ClipboardIcon, ArrowRightIcon } from "../../components/Icons";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#0b69a3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  const totalOrders = stats.pendingOrders + stats.inProgressOrders;
  const pendingPercentage = totalOrders > 0 ? (stats.pendingOrders / totalOrders) * 100 : 0;
  const inProgressPercentage = totalOrders > 0 ? (stats.inProgressOrders / totalOrders) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
              <p className="text-gray-600 text-sm mt-1">Order and inventory management</p>
            </div>
            <form method="POST" action="/api/auth/logout">
              <button className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Pending Orders"
            value={stats.pendingOrders}
            icon={<ClockIcon className="w-6 h-6" />}
            highlight={stats.pendingOrders > 0}
            accentColor="text-yellow-600"
          />
          <StatCard
            label="In Progress"
            value={stats.inProgressOrders}
            icon={<SettingsIcon className="w-6 h-6" />}
            accentColor="text-blue-600"
          />
          <StatCard
            label="Pending Batches"
            value={stats.pendingBatches}
            icon={<PackageIcon className="w-6 h-6" />}
            highlight={stats.pendingBatches > 0}
            accentColor="text-purple-600"
          />
          <StatCard
            label="Inventory Updates (7d)"
            value={stats.inventoryUpdates}
            icon={<ChartIcon className="w-6 h-6" />}
            accentColor="text-green-600"
          />
        </div>

        {/* Order Status Visualization */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#0b69a3] flex items-center justify-center text-white">
              <ChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Order Status Distribution</h2>
              <p className="text-sm text-gray-500">Current order pipeline</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Pending Orders</span>
                <span className="text-lg font-bold text-yellow-600">{stats.pendingOrders}</span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-yellow-500 rounded-full transition-all duration-500"
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
                <span className="text-lg font-bold text-blue-600">{stats.inProgressOrders}</span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-[#0b69a3] rounded-full transition-all duration-500"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ActionCard
            title="Manage Orders"
            description="View and batch orders"
            href="/ops/orders"
            icon={<ClipboardIcon className="w-6 h-6" />}
          />
          <ActionCard
            title="Update Inventory"
            description="Update inventory levels by site"
            href="/ops/inventory"
            icon={<ChartIcon className="w-6 h-6" />}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight = false, accentColor = "text-[#0b69a3]" }) {
  return (
    <div className={`bg-white rounded-xl border ${highlight ? "border-orange-300 bg-orange-50" : "border-gray-200"} shadow-sm hover:shadow-md transition-shadow p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${accentColor} bg-opacity-10 flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        {highlight && (
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
        )}
      </div>
      <div className={`text-xs ${highlight ? "text-orange-700 font-semibold" : "text-gray-600"} mb-1`}>{label}</div>
      <div className={`text-2xl font-bold ${accentColor}`}>
        {value}
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, icon }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#0b69a3] transition-all p-8 group"
    >
      <div className="w-12 h-12 rounded-lg bg-[#0b69a3] bg-opacity-10 text-[#0b69a3] flex items-center justify-center mb-4 group-hover:bg-opacity-20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex items-center text-sm font-medium text-[#0b69a3] group-hover:gap-2 transition-all">
        <span>Go to {title}</span>
        <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

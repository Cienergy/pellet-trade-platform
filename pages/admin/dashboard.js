import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [biData, setBiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard", { credentials: "include" })
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login");
            return null;
          }
          return res.json();
        }),
      fetch("/api/admin/bi-dashboard", { credentials: "include" })
        .then((res) => res.ok ? res.json() : null)
        .catch(() => null),
    ]).then(([dashboardData, biDashboardData]) => {
      if (dashboardData) setStats(dashboardData);
      if (biDashboardData) setBiData(biDashboardData);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">System overview and management</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <PremiumStatCard
            label="Active Users"
            value={stats.users}
            icon="👥"
            color="from-blue-500 to-cyan-500"
            trend="+12%"
          />
          <PremiumStatCard
            label="Products"
            value={stats.products}
            icon="📦"
            color="from-green-500 to-emerald-500"
            trend="+5%"
          />
          <PremiumStatCard
            label="Sites"
            value={stats.sites}
            icon="🏭"
            color="from-purple-500 to-pink-500"
            trend="+2"
          />
          <PremiumStatCard
            label="Total Inventory"
            value={`${stats.totalInventoryMT.toFixed(1)} MT`}
            icon="📊"
            color="from-orange-500 to-red-500"
            isText={true}
          />
          <PremiumStatCard
            label="Total Orders"
            value={stats.orders}
            icon="📋"
            color="from-indigo-500 to-purple-500"
            trend="+8%"
          />
        </div>

        {/* Business Intelligence Section */}
        {biData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Buyers */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xl">
                  👥
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Buyers</h2>
                  <p className="text-sm text-gray-500">Most active organizations</p>
                </div>
              </div>
              <div className="space-y-4">
                {biData.topBuyers && biData.topBuyers.length > 0 ? (
                  biData.topBuyers.map((buyer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{buyer.orgName}</div>
                          <div className="text-sm text-gray-500">{buyer.orderCount} orders</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{buyer.totalMT.toFixed(1)} MT</div>
                        <div className="text-xs text-gray-500">Total volume</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No buyer data available</div>
                )}
              </div>
            </div>

            {/* Hot Products */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xl">
                  🔥
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Hot in Market</h2>
                  <p className="text-sm text-gray-500">Trending products</p>
                </div>
              </div>
              <div className="space-y-4">
                {biData.productTrends && biData.productTrends.length > 0 ? (
                  biData.productTrends.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{product.productName}</div>
                          <div className="text-sm text-gray-500">{product.batchCount} batches</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{product.totalMT.toFixed(1)} MT</div>
                        <div className="text-xs text-gray-500">Total volume</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No product data available</div>
                )}
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl">
                  📊
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Order Status</h2>
                  <p className="text-sm text-gray-500">Distribution overview</p>
                </div>
              </div>
              <div className="space-y-4">
                {biData.orderStatuses && biData.orderStatuses.map((status, idx) => {
                  const total = biData.orderStatuses.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (status.count / total) * 100 : 0;
                  const colors = [
                    "from-blue-500 to-cyan-500",
                    "from-green-500 to-emerald-500",
                    "from-purple-500 to-pink-500",
                    "from-orange-500 to-red-500",
                  ];
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">{status.status}</span>
                        <span className="text-sm font-bold text-gray-900">{status.count}</span>
                      </div>
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-500 shadow-sm`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Site Performance */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xl">
                  🏭
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Site Performance</h2>
                  <p className="text-sm text-gray-500">Top performing sites</p>
                </div>
              </div>
              <div className="space-y-4">
                {biData.sitePerformance && biData.sitePerformance.length > 0 ? (
                  biData.sitePerformance.map((site, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{site.siteName}</div>
                          <div className="text-sm text-gray-500">{site.batchCount} batches</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{site.totalMT.toFixed(1)} MT</div>
                        <div className="text-xs text-gray-500">Total volume</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No site data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumActionCard
            title="Manage Users"
            description="Create and manage user accounts"
            href="/admin/users"
            icon="👥"
            color="from-blue-500 to-cyan-500"
          />
          <PremiumActionCard
            title="Manage Products"
            description="Add and update products"
            href="/admin/products"
            icon="📦"
            color="from-green-500 to-emerald-500"
          />
          <PremiumActionCard
            title="Manage Sites"
            description="Configure factory sites"
            href="/admin/sites"
            icon="🏭"
            color="from-purple-500 to-pink-500"
          />
          <PremiumActionCard
            title="Manage Inventory"
            description="Update inventory levels"
            href="/ops/inventory"
            icon="📊"
            color="from-orange-500 to-red-500"
          />
        </div>
      </div>
    </div>
  );
}

function PremiumStatCard({ label, value, icon, color, trend, isText = false }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-6 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && (
          <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
            {trend}
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
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
      className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 p-6 group hover:scale-105"
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
      <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
        <span>Go to {title}</span>
        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

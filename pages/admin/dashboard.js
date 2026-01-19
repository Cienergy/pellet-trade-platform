import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { UsersIcon, PackageIcon, FactoryIcon, ChartIcon, ClipboardIcon, ArrowRightIcon, TrendingUpIcon } from "../../components/Icons";

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 text-sm mt-1">System overview and management</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatCard
            label="Active Users"
            value={stats.users}
            icon={<UsersIcon className="w-6 h-6" />}
            trend="+12%"
            accentColor="text-[#0b69a3]"
          />
          <StatCard
            label="Products"
            value={stats.products}
            icon={<PackageIcon className="w-6 h-6" />}
            trend="+5%"
            accentColor="text-green-600"
          />
          <StatCard
            label="Sites"
            value={stats.sites}
            icon={<FactoryIcon className="w-6 h-6" />}
            trend="+2"
            accentColor="text-purple-600"
          />
          <StatCard
            label="Total Inventory"
            value={`${stats.totalInventoryMT.toFixed(1)} MT`}
            icon={<ChartIcon className="w-6 h-6" />}
            isText={true}
            accentColor="text-orange-600"
          />
          <StatCard
            label="Total Orders"
            value={stats.orders}
            icon={<ClipboardIcon className="w-6 h-6" />}
            trend="+8%"
            accentColor="text-indigo-600"
          />
        </div>

        {/* Business Intelligence Section */}
        {biData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Buyers */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#0b69a3] flex items-center justify-center text-white">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Top Buyers</h2>
                  <p className="text-sm text-gray-500">Most active organizations</p>
                </div>
              </div>
              <div className="space-y-3">
                {biData.topBuyers && biData.topBuyers.length > 0 ? (
                  biData.topBuyers.map((buyer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0b69a3] flex items-center justify-center text-white font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{buyer.orgName}</div>
                          <div className="text-xs text-gray-500">{buyer.orderCount} orders</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">{buyer.totalMT.toFixed(1)} MT</div>
                        <div className="text-xs text-gray-500">Total volume</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">No buyer data available</div>
                )}
              </div>
            </div>

            {/* Hot Products */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                  <TrendingUpIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Hot in Market</h2>
                  <p className="text-sm text-gray-500">Trending products</p>
                </div>
              </div>
              <div className="space-y-3">
                {biData.productTrends && biData.productTrends.length > 0 ? (
                  biData.productTrends.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{product.productName}</div>
                          <div className="text-xs text-gray-500">{product.batchCount} batches</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">{product.totalMT.toFixed(1)} MT</div>
                        <div className="text-xs text-gray-500">Total volume</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">No product data available</div>
                )}
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                  <ChartIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Order Status</h2>
                  <p className="text-sm text-gray-500">Distribution overview</p>
                </div>
              </div>
              <div className="space-y-4">
                {biData.orderStatuses && biData.orderStatuses.map((status, idx) => {
                  const total = biData.orderStatuses.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (status.count / total) * 100 : 0;
                  const colors = ["bg-[#0b69a3]", "bg-green-600", "bg-purple-600", "bg-orange-600"];
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">{status.status}</span>
                        <span className="text-sm font-bold text-gray-900">{status.count}</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white">
                  <FactoryIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Site Performance</h2>
                  <p className="text-sm text-gray-500">Top performing sites</p>
                </div>
              </div>
              <div className="space-y-3">
                {biData.sitePerformance && biData.sitePerformance.length > 0 ? (
                  biData.sitePerformance.map((site, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{site.siteName}</div>
                          <div className="text-xs text-gray-500">{site.batchCount} batches</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">{site.totalMT.toFixed(1)} MT</div>
                        <div className="text-xs text-gray-500">Total volume</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">No site data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <ActionCard
            title="Manage Users"
            description="Create and manage user accounts"
            href="/admin/users"
            icon={<UsersIcon className="w-6 h-6" />}
          />
          <ActionCard
            title="Manage Products"
            description="Add and update products"
            href="/admin/products"
            icon={<PackageIcon className="w-6 h-6" />}
          />
          <ActionCard
            title="Manage Sites"
            description="Configure factory sites"
            href="/admin/sites"
            icon={<FactoryIcon className="w-6 h-6" />}
          />
          <ActionCard
            title="Manage Inventory"
            description="Update inventory levels"
            href="/ops/inventory"
            icon={<ChartIcon className="w-6 h-6" />}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, isText = false, accentColor = "text-[#0b69a3]" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${accentColor} bg-opacity-10 flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        {trend && (
          <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
            {trend}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
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
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#0b69a3] transition-all p-6 group"
    >
      <div className="w-12 h-12 rounded-lg bg-[#0b69a3] bg-opacity-10 text-[#0b69a3] flex items-center justify-center mb-4 group-hover:bg-opacity-20 transition-colors">
        {icon}
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex items-center text-sm font-medium text-[#0b69a3] group-hover:gap-2 transition-all">
        <span>Go to {title}</span>
        <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

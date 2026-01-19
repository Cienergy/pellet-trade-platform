import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function FinanceDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance/dashboard", { credentials: "include" })
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  const revenuePercentage = stats.totalRevenue > 0 
    ? ((stats.verifiedPayments * 100000) / stats.totalRevenue) * 100 
    : 0;
  const pendingPercentage = stats.totalRevenue > 0
    ? (stats.pendingAmount / stats.totalRevenue) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Finance Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Payment and invoice management</p>
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
            label="Pending Payments"
            value={stats.pendingPayments}
            icon="⏳"
            color="from-yellow-500 to-amber-500"
            highlight={stats.pendingPayments > 0}
          />
          <PremiumStatCard
            label="Pending Amount"
            value={`₹${(stats.pendingAmount / 100000).toFixed(1)}L`}
            icon="💰"
            color="from-orange-500 to-red-500"
            isText={true}
            highlight={stats.pendingAmount > 0}
          />
          <PremiumStatCard
            label="Total Invoices"
            value={stats.invoices}
            icon="📄"
            color="from-blue-500 to-indigo-500"
          />
          <PremiumStatCard
            label="Total Revenue"
            value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`}
            icon="💵"
            color="from-green-500 to-emerald-500"
            isText={true}
          />
          <PremiumStatCard
            label="Verified Payments"
            value={stats.verifiedPayments}
            icon="✓"
            color="from-emerald-500 to-teal-500"
          />
        </div>

        {/* Revenue Overview */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-2xl">
              📈
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Revenue Overview</h2>
              <p className="text-sm text-gray-500">Financial performance metrics</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Total Revenue */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Total Revenue</span>
                <span className="text-2xl font-bold text-gray-900">₹{(stats.totalRevenue / 100000).toFixed(1)}L</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>

            {/* Verified Payments */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Verified Payments</span>
                <span className="text-xl font-bold text-blue-600">{revenuePercentage.toFixed(1)}%</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.verifiedPayments} payments verified
              </div>
            </div>

            {/* Pending Amount */}
            {stats.pendingAmount > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-orange-700">Pending Amount</span>
                  <span className="text-xl font-bold text-orange-600">₹{(stats.pendingAmount / 100000).toFixed(1)}L</span>
                </div>
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min(pendingPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-orange-600 mt-1 font-medium">
                  Requires attention
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PremiumActionCard
            title="Review Payments"
            description="Approve or reject payment proofs"
            href="/finance/payments"
            icon="💰"
            color="from-yellow-500 to-amber-500"
          />
          <PremiumActionCard
            title="Manage Invoices"
            description="View, filter, and download invoices"
            href="/finance/invoices"
            icon="📄"
            color="from-blue-500 to-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

function PremiumStatCard({ label, value, icon, color, highlight = false, isText = false }) {
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

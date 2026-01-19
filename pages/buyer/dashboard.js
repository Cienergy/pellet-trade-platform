import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../components/BuyerLayout";
import Link from "next/link";

export default function BuyerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth on mount
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((user) => {
        if (user && user.role !== "BUYER") {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));

    // Load buyer stats
    fetch("/api/buyer/orders", { credentials: "include" })
      .then((res) => res.json())
      .then((orders) => {
        if (Array.isArray(orders)) {
          const activeOrders = orders.filter(o => o.status !== "COMPLETED").length;
          const totalMT = orders.reduce((sum, o) => sum + (o.totalMT || 0), 0);
          const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const paidAmount = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
          const pendingPayments = orders.reduce((sum, o) => {
            return sum + (o.batches?.filter(b => 
              b.invoice?.payments?.some(p => !p.verified)
            ).length || 0);
          }, 0);
          
          setStats({
            activeOrders,
            pendingPayments,
            totalOrdered: totalMT,
            totalOrders: orders.length,
            totalAmount,
            paidAmount,
            pendingAmount: totalAmount - paidAmount,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <BuyerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </BuyerLayout>
    );
  }

  const paymentProgress = stats?.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount) * 100 : 0;

  return (
    <BuyerLayout title="Dashboard">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Buyer Dashboard
          </h1>
          <p className="text-gray-600">
            Overview of your orders and payments
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumStatCard
            label="Active Orders"
            value={stats?.activeOrders || 0}
            icon="📋"
            color="from-blue-500 to-cyan-500"
          />
          <PremiumStatCard
            label="Pending Payments"
            value={stats?.pendingPayments || 0}
            icon="⏳"
            color="from-yellow-500 to-orange-500"
            highlight={stats?.pendingPayments > 0}
          />
          <PremiumStatCard
            label="Total Ordered"
            value={`${(stats?.totalOrdered || 0).toFixed(1)} MT`}
            icon="📦"
            color="from-green-500 to-emerald-500"
            isText={true}
          />
          <PremiumStatCard
            label="Total Orders"
            value={stats?.totalOrders || 0}
            icon="📊"
            color="from-purple-500 to-indigo-500"
          />
        </div>

        {/* Financial Overview */}
        {stats && stats.totalAmount > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-2xl">
                💰
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
                <p className="text-sm text-gray-500">Payment and order value summary</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-sm text-gray-600 mb-1">Total Order Value</div>
                <div className="text-2xl font-bold text-indigo-700">
                  ₹{stats.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="text-sm text-gray-600 mb-1">Paid Amount</div>
                <div className="text-2xl font-bold text-green-700">
                  ₹{stats.paidAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <div className="text-sm text-gray-600 mb-1">Pending Amount</div>
                <div className="text-2xl font-bold text-orange-700">
                  ₹{stats.pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Payment Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Payment Progress</span>
                <span className="font-semibold text-gray-900">{paymentProgress.toFixed(1)}%</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Paid: ₹{stats.paidAmount.toLocaleString("en-IN")}</span>
                <span>Remaining: ₹{stats.pendingAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PremiumActionCard
            title="Browse Catalog"
            description="View live availability and pricing synced with ERP"
            href="/buyer/catalog"
            icon="📦"
            color="from-blue-500 to-cyan-500"
          />
          <PremiumActionCard
            title="My Orders"
            description="Track orders, invoices, and payment status"
            href="/buyer/orders"
            icon="📋"
            color="from-green-500 to-emerald-500"
          />
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
              ℹ️
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">ERP Synchronization</h3>
              <p className="text-sm text-gray-600">
                All availability, pricing, and invoices are synced with the ERP. For discrepancies, contact operations or finance support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
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

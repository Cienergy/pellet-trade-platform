import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../components/BuyerLayout";
import Link from "next/link";
import { ClipboardIcon, ClockIcon, PackageIcon, ChartIcon, CurrencyIcon, InfoIcon, ArrowRightIcon } from "../../components/Icons";

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
            <div className="w-12 h-12 border-3 border-[#0b69a3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading dashboard...</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Buyer Dashboard</h1>
          <p className="text-gray-600 text-sm">
            Overview of your orders and payments
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Active Orders"
            value={stats?.activeOrders || 0}
            icon={<ClipboardIcon className="w-6 h-6" />}
            accentColor="text-blue-600"
          />
          <StatCard
            label="Pending Payments"
            value={stats?.pendingPayments || 0}
            icon={<ClockIcon className="w-6 h-6" />}
            highlight={stats?.pendingPayments > 0}
            accentColor="text-yellow-600"
          />
          <StatCard
            label="Total Ordered"
            value={`${(stats?.totalOrdered || 0).toFixed(1)} MT`}
            icon={<PackageIcon className="w-6 h-6" />}
            isText={true}
            accentColor="text-green-600"
          />
          <StatCard
            label="Total Orders"
            value={stats?.totalOrders || 0}
            icon={<ChartIcon className="w-6 h-6" />}
            accentColor="text-purple-600"
          />
        </div>

        {/* Financial Overview */}
        {stats && stats.totalAmount > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white">
                <CurrencyIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Financial Overview</h2>
                <p className="text-sm text-gray-500">Payment and order value summary</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-xs text-gray-600 mb-1">Total Order Value</div>
                <div className="text-xl font-bold text-[#0b69a3]">
                  ₹{stats.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-xs text-gray-600 mb-1">Paid Amount</div>
                <div className="text-xl font-bold text-green-600">
                  ₹{stats.paidAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="text-xs text-gray-600 mb-1">Pending Amount</div>
                <div className="text-xl font-bold text-orange-600">
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
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full bg-green-600 rounded-full transition-all duration-500"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ActionCard
            title="Browse Catalog"
            description="View live availability and pricing synced with ERP"
            href="/buyer/catalog"
            icon={<PackageIcon className="w-6 h-6" />}
          />
          <ActionCard
            title="My Orders"
            description="Track orders, invoices, and payment status"
            href="/buyer/orders"
            icon={<ClipboardIcon className="w-6 h-6" />}
          />
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0b69a3] flex items-center justify-center text-white flex-shrink-0">
              <InfoIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">ERP Synchronization</h3>
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

function StatCard({ label, value, icon, highlight = false, isText = false, accentColor = "text-[#0b69a3]" }) {
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

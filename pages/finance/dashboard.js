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

  const revenuePercentage = stats.totalRevenue > 0 
    ? ((stats.verifiedPayments * 100000) / stats.totalRevenue) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Finance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Payment and invoice management</p>
          </div>
          <form method="POST" action="/api/auth/logout">
            <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition">
              Logout
            </button>
          </form>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard
            label="Pending Payments"
            value={stats.pendingPayments}
            highlight={stats.pendingPayments > 0}
            color="from-yellow-500 to-orange-500"
          />
          <StatCard
            label="Pending Amount"
            value={`₹${(stats.pendingAmount / 100000).toFixed(1)}L`}
            highlight={stats.pendingAmount > 0}
            color="from-orange-500 to-red-500"
            isText={true}
          />
          <StatCard 
            label="Total Invoices" 
            value={stats.invoices}
            color="from-blue-500 to-indigo-500"
          />
          <StatCard
            label="Total Revenue"
            value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`}
            color="from-green-500 to-emerald-500"
            isText={true}
          />
          <StatCard
            label="Verified Payments"
            value={stats.verifiedPayments}
            color="from-emerald-500 to-teal-500"
          />
        </div>

        {/* Revenue Visualization */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Revenue Overview</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Total Revenue</span>
                <span className="text-sm font-bold">₹{(stats.totalRevenue / 100000).toFixed(1)}L</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Verified Payments</span>
                <span className="text-sm font-bold">{revenuePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                ></div>
              </div>
            </div>
            {stats.pendingAmount > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Pending Amount</span>
                  <span className="text-sm font-bold text-orange-600">₹{(stats.pendingAmount / 100000).toFixed(1)}L</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className="h-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                    style={{ width: `${Math.min((stats.pendingAmount / stats.totalRevenue) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            title="Review Payments"
            description="Approve or reject payment proofs"
            href="/finance/payments"
            icon="💰"
          />
          <ActionCard
            title="Manage Invoices"
            description="View, filter, and download invoices"
            href="/finance/invoices"
            icon="📄"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false, color, isText = false }) {
  return (
    <div
      className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all ${
        highlight ? "border-orange-400 bg-orange-50" : ""
      }`}
    >
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className={`text-3xl font-bold ${highlight ? "text-orange-600" : ""}`}>
        {value}
      </div>
      {!isText && (
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${color}`}
            style={{ width: "60%" }}
          ></div>
        </div>
      )}
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

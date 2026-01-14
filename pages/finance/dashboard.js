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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Finance Dashboard</h1>
          <form method="POST" action="/api/auth/logout">
            <button className="px-4 py-2 bg-black text-white rounded">
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
          />
          <StatCard
            label="Pending Amount"
            value={`₹${(stats.pendingAmount / 100000).toFixed(1)}L`}
            highlight={stats.pendingAmount > 0}
          />
          <StatCard label="Total Invoices" value={stats.invoices} />
          <StatCard
            label="Total Revenue"
            value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`}
          />
          <StatCard
            label="Verified Payments"
            value={stats.verifiedPayments}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard
            title="Review Payments"
            description="Approve or reject payment proofs"
            href="/finance/payments"
          />
          <ActionCard
            title="Manage Invoices"
            description="View, filter, and download invoices"
            href="/finance/invoices"
          />
          <ActionCard
            title="Create Invoice"
            description="Generate GST invoices for batches"
            href="/finance/invoices/create"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div
      className={`bg-white rounded-xl border p-6 ${
        highlight ? "border-orange-400 bg-orange-50" : ""
      }`}
    >
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}

function ActionCard({ title, description, href }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}


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
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <BuyerLayout>
        <div className="p-6">Loading dashboard...</div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            Buyer Dashboard
          </h1>
          <p className="text-gray-600">
            Overview of your orders and payments
          </p>
        </div>

        {/* KPI Cards with Visualizations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            label="Active Orders" 
            value={stats?.activeOrders || 0}
            color="from-blue-500 to-blue-600"
          />
          <StatCard 
            label="Pending Payments" 
            value={stats?.pendingPayments || 0}
            color="from-yellow-500 to-orange-500"
            highlight={stats?.pendingPayments > 0}
          />
          <StatCard 
            label="Total Ordered (MT)" 
            value={stats?.totalOrdered || 0}
            color="from-green-500 to-emerald-500"
          />
          <StatCard 
            label="Total Orders" 
            value={stats?.totalOrders || 0}
            color="from-purple-500 to-indigo-500"
          />
        </div>

        {/* Visualization */}
        {stats && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Order Overview</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Active Orders</span>
                  <span className="text-sm font-bold">{stats.activeOrders}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{ width: `${stats.totalOrders > 0 ? (stats.activeOrders / stats.totalOrders) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Total Quantity Ordered</span>
                  <span className="text-sm font-bold">{stats.totalOrdered} MT</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${Math.min((stats.totalOrdered / 1000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            title="Browse Catalog"
            description="View live availability and pricing synced with ERP"
            href="/buyer/catalog"
            cta="Go to Catalog"
            icon="📦"
          />

          <ActionCard
            title="My Orders"
            description="Track orders, invoices, and payment status"
            href="/buyer/orders"
            cta="View Orders"
            icon="📋"
          />
        </div>

        {/* Info */}
        <div className="text-sm text-gray-500 bg-blue-50 p-4 rounded-lg">
          All availability, pricing, and invoices are synced with the ERP.
          For discrepancies, contact operations or finance support.
        </div>
      </div>
    </BuyerLayout>
  );
}

function StatCard({ label, value, color, highlight = false }) {
  return (
    <div className={`bg-white rounded-xl border p-6 hover:shadow-md transition-all ${
      highlight ? "border-orange-400 bg-orange-50" : ""
    }`}>
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className={`text-3xl font-bold mb-3 ${highlight ? "text-orange-600" : ""}`}>
        {value}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${color}`}
          style={{ width: "70%" }}
        ></div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, cta, icon }) {
  return (
    <div className="bg-white rounded-xl border p-8 flex flex-col justify-between hover:shadow-lg transition-all hover:scale-105">
      <div>
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
      </div>

      <Link
        href={href}
        className="inline-block text-center px-6 py-3 rounded bg-black text-white hover:bg-gray-800 transition"
      >
        {cta}
      </Link>
    </div>
  );
}

import { useEffect } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../components/BuyerLayout";
import Link from "next/link";

export default function BuyerDashboard() {
  const router = useRouter();

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
  }, [router]);
  // Mock numbers for UI phase
  const stats = {
    activeOrders: 3,
    pendingPayments: 2,
    totalOrdered: 420,
    lastInvoice: "₹18.6L",
  };

  return (
    <BuyerLayout>
      <h1 className="text-3xl font-semibold mb-2">
        Buyer Dashboard
      </h1>
      <p className="text-gray-600 mb-10">
        Overview of your orders and payments
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <StatCard label="Active Orders" value={stats.activeOrders} />
        <StatCard label="Pending Payments" value={stats.pendingPayments} />
        <StatCard label="Total Ordered (MT)" value={stats.totalOrdered} />
        <StatCard label="Last Invoice" value={stats.lastInvoice} />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        <ActionCard
          title="Browse Catalog"
          description="View live availability and pricing synced with ERP"
          href="/buyer/catalog"
          cta="Go to Catalog"
        />

        <ActionCard
          title="My Orders"
          description="Track orders, invoices, and payment status"
          href="/buyer/orders"
          cta="View Orders"
        />
      </div>

      {/* Info */}
      <div className="text-sm text-gray-500">
        All availability, pricing, and invoices are synced with the ERP.
        For discrepancies, contact operations or finance support.
      </div>
    </BuyerLayout>
  );
}

/* ---------- Components ---------- */

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="text-sm text-gray-500 mb-2">
        {label}
      </div>
      <div className="text-3xl font-semibold">
        {value}
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, cta }) {
  return (
    <div className="bg-white rounded-xl border p-8 flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-semibold mb-2">
          {title}
        </h3>
        <p className="text-gray-600 mb-6">
          {description}
        </p>
      </div>

      <Link
        href={href}
        className="inline-block text-center px-6 py-3 rounded bg-black text-white"
      >
        {cta}
      </Link>
    </div>
  );
}

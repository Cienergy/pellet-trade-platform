import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { DocumentIcon, ChartIcon, ArrowRightIcon } from "../../components/Icons";

export default function FinanceReports() {
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setError(null);
    const params = new URLSearchParams({ from, to });
    fetch(`/api/finance/sales-report?${params}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return null;
        }
        if (!res.ok) {
          return res.json().then((b) => Promise.reject(new Error(b?.error || "Request failed")));
        }
        return res.json();
      })
      .then((json) => {
        if (json != null) setReport(json);
      })
      .catch((err) => setError(err.message || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [from, to, router]);

  function downloadOrdersCsv() {
    const params = new URLSearchParams({ from, to });
    window.open(`/api/finance/orders/export?${params}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
              <p className="text-gray-600 text-sm mt-1">Period summary and exports</p>
            </div>
            <Link
              href="/finance/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              ← Dashboard
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <span>From</span>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>To</span>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              onClick={downloadOrdersCsv}
              className="px-4 py-2 bg-[#0b69a3] text-white rounded-lg hover:bg-[#095b88] text-sm font-medium"
            >
              Export Orders (CSV)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-sm underline">
              Dismiss
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/finance/receivables"
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-[#0b69a3] p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Receivables & Aging</h3>
              <p className="text-sm text-gray-500">Overdue and due-in-7-days view</p>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-gray-400 ml-auto" />
          </Link>
          <Link
            href="/admin/activity-log"
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-[#0b69a3] p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <DocumentIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Activity Log</h3>
              <p className="text-sm text-gray-500">User and system activity</p>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-gray-400 ml-auto" />
          </Link>
          <Link
            href="/ops/dispatch-timeline"
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-[#0b69a3] p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <ChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Dispatch Timelines</h3>
              <p className="text-sm text-gray-500">Delivery performance</p>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-gray-400 ml-auto" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-[#0b69a3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : report ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">
              Sales Summary ({report.from} to {report.to})
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase">Total Invoices</div>
                <div className="text-2xl font-bold text-gray-900">{report.totalInvoices}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{(report.totalRevenue / 100000).toFixed(1)}L
                </div>
              </div>
            </div>
            {report.byProduct?.length > 0 && (
              <div className="px-6 pb-6">
                <div className="text-sm font-semibold text-gray-700 mb-2">By Product</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Invoices</th>
                        <th className="pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byProduct.map((r) => (
                        <tr key={r.name} className="border-b border-gray-100">
                          <td className="py-2">{r.name}</td>
                          <td className="py-2">{r.count}</td>
                          <td className="py-2">₹{r.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {report.byBuyer?.length > 0 && (
              <div className="px-6 pb-6">
                <div className="text-sm font-semibold text-gray-700 mb-2">By Buyer</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Buyer</th>
                        <th className="pb-2">Invoices</th>
                        <th className="pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byBuyer.map((r) => (
                        <tr key={r.name} className="border-b border-gray-100">
                          <td className="py-2">{r.name}</td>
                          <td className="py-2">{r.count}</td>
                          <td className="py-2">₹{r.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : !error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No report data
          </div>
        ) : null}
      </div>
    </div>
  );
}

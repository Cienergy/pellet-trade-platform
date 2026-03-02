import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ClockIcon, CurrencyIcon, DocumentIcon, ArrowRightIcon } from "../../components/Icons";
import { formatISTDate } from "../../lib/dateUtils";

export default function FinanceReceivables() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    fetch("/api/finance/receivables", { credentials: "include" })
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
        if (json != null) setData(json);
      })
      .catch((err) => setError(err.message || "Failed to load receivables"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#0b69a3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        No data
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Receivables & Aging</h1>
              <p className="text-gray-600 text-sm mt-1">Overdue invoices and aging summary</p>
            </div>
            <Link
              href="/finance/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="text-xs font-semibold text-red-700 mb-1">Overdue Invoices</div>
            <div className="text-2xl font-bold text-red-700">{data.overdueCount}</div>
            <div className="text-sm text-red-600">₹{(data.overdueAmount / 100000).toFixed(1)}L outstanding</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-semibold text-amber-700 mb-1">Due in 7 Days</div>
            <div className="text-2xl font-bold text-amber-700">{data.dueIn7Count}</div>
            <div className="text-sm text-amber-600">₹{(data.dueIn7Amount / 100000).toFixed(1)}L</div>
          </div>
        </div>

        {data.overdue?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Overdue Invoices</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 border-b">Invoice</th>
                    <th className="p-3 border-b">Buyer</th>
                    <th className="p-3 border-b">Due Date</th>
                    <th className="p-3 border-b">Outstanding</th>
                    <th className="p-3 border-b">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.map((row) => (
                    <tr key={row.invoiceId} className="border-b border-gray-100">
                      <td className="p-3">
                        <a href={`/invoice/${row.invoiceId}`} className="text-[#0b69a3] hover:underline">
                          {row.invoiceNumber}
                        </a>
                      </td>
                      <td className="p-3">{row.buyerName}</td>
                      <td className="p-3">{formatISTDate(row.dueDate)}</td>
                      <td className="p-3 font-medium">₹{row.outstanding.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-red-600">{row.daysOverdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Aging Summary</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
            {["0-30", "31-60", "61-90", "90+"].map((bucket) => {
              const b = data.aging[bucket];
              return (
                <div key={bucket} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase">{bucket} days</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{b?.count ?? 0} invoices</div>
                  <div className="text-sm text-gray-600">₹{((b?.amount || 0) / 100000).toFixed(1)}L</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

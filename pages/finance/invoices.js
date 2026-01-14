import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function FinanceInvoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadInvoices();
  }, [filters]);

  async function loadInvoices() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    fetch(`/api/invoices?${params}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setInvoices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function downloadCSV() {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    window.open(`/api/finance/invoices/download?${params}`, "_blank");
  }

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Invoice Management</h1>
            <p className="text-gray-600 mt-1">
              View, filter, and download invoices
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download CSV
            </button>
            <Link
              href="/finance/dashboard"
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Status
              </label>
              <select
                className="w-full border p-2 rounded"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">All</option>
                <option value="CREATED">Created</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: "", startDate: "", endDate: "" })}
                className="w-full px-4 py-2 border rounded hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            No invoices found
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-xl border p-6 space-y-4"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Invoice Number</div>
                    <div className="font-semibold">{invoice.number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date</div>
                    <div>
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Organization</div>
                    <div>{invoice.batch?.order?.org?.name || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Amount</div>
                    <div className="font-semibold">
                      ₹{invoice.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Status</div>
                    <div
                      className={`inline-block px-2 py-1 rounded text-sm ${
                        invoice.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : invoice.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {invoice.status}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Product: {invoice.batch?.product?.name || "-"} | Quantity:{" "}
                  {invoice.batch?.quantityMT || 0} MT
                </div>

                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">Payments</div>
                    <div className="space-y-2">
                      {invoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span>
                            ₹{payment.amount} via {payment.mode}
                          </span>
                          <span
                            className={`px-2 py-1 rounded ${
                              payment.verified
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {payment.verified ? "Verified" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { showToast } from "../../components/Toast";
import { formatIST } from "../../lib/dateUtils";

export default function FinancePayments() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/finance/payments", { credentials: "include" })
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login");
            return null;
          }
          return res.json();
        }),
      fetch("/api/finance/payments/history", { credentials: "include" })
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            return null;
          }
          return res.json();
        })
    ]).then(([paymentsData, historyData]) => {
      if (paymentsData) setPayments(paymentsData);
      if (historyData) setHistory(historyData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  async function verifyPayment(paymentId, approve) {
    const res = await fetch(`/api/payments/${paymentId}/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    });

    if (res.ok) {
      setPayments((p) => p.filter((pay) => pay.id !== paymentId));
      showToast(approve ? "Payment approved successfully" : "Payment rejected", "success");
      // Reload history
      fetch("/api/finance/payments/history", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data) setHistory(data);
        });
    } else {
      showToast("Failed to update payment", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Review Payments
            </h1>
            <p className="text-gray-600 mt-1">
              Approve or reject payment proofs
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 border rounded hover:bg-gray-50 transition"
            >
              {showHistory ? "Hide" : "Show"} History
            </button>
            <Link
              href="/finance/dashboard"
              className="px-4 py-2 border rounded hover:bg-gray-50 transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Payment Review History */}
        {showHistory && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review History</h2>
            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No review history yet</div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.action === "verified"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {item.action === "verified" ? "Approved" : "Rejected"}
                        </span>
                        {item.payment && (
                          <>
                            <span className="font-semibold">₹{item.payment.amount.toLocaleString("en-IN")}</span>
                            <span className="text-gray-600">via {item.payment.mode}</span>
                            {item.payment.invoiceNumber && (
                              <span className="text-gray-500">Invoice: {item.payment.invoiceNumber}</span>
                            )}
                            {item.payment.organization && (
                              <span className="text-gray-500">• {item.payment.organization}</span>
                            )}
                          </>
                        )}
                      </div>
                      {item.reviewer && (
                        <div className="text-xs text-gray-500 mt-1">
                          Reviewed by {item.reviewer.name} ({item.reviewer.email}) on{" "}
                          {formatIST(item.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Payments */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Review</h2>
          {payments.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              No pending payments to review
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white rounded-xl border p-6 space-y-4 shadow-sm hover:shadow-md transition"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Invoice</div>
                    <div className="font-semibold">
                      {payment.invoice?.number || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Amount</div>
                    <div className="font-semibold">₹{payment.amount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Payment Mode</div>
                    <div className="font-semibold">{payment.mode}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Organization</div>
                    <div className="font-semibold">
                      {payment.invoice?.batch?.order?.org?.name || "-"}
                    </div>
                  </div>
                </div>

                {payment.proofUrl && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">
                      Payment Proof
                    </div>
                    <a
                      href={payment.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Proof →
                    </a>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => verifyPayment(payment.id, true)}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => verifyPayment(payment.id, false)}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded hover:from-red-700 hover:to-rose-700 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function FinancePayments() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance/payments", { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setPayments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    } else {
      alert("Failed to update payment");
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
          <Link
            href="/finance/dashboard"
            className="px-4 py-2 border rounded hover:bg-gray-50 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

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
  );
}


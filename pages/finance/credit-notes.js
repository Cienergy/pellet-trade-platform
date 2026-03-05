import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function FinanceCreditNotes() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ invoiceId: "", amount: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/finance/credit-notes", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch("/api/invoices", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
    ]).then(([cnList, invList]) => {
      setList(Array.isArray(cnList) ? cnList : []);
      setInvoices(Array.isArray(invList) ? invList : []);
      setLoading(false);
    });
  }, []);

  async function createCreditNote(e) {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/credit-notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: form.invoiceId,
          amount: parseFloat(form.amount),
          reason: form.reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      setForm({ invoiceId: "", amount: "", reason: "" });
      setList((prev) => [data, ...prev]);
      setMsg("Credit note created.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createRefund(creditNoteId, amount) {
    try {
      const res = await fetch("/api/finance/refunds", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditNoteId, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed");
        return;
      }
      setList((prev) =>
        prev.map((cn) =>
          cn.id === creditNoteId
            ? { ...cn, refunds: [...(cn.refunds || []), data] }
            : cn
        )
      );
    } catch (e) {
      alert("Failed");
    }
  }

  async function markRefundProcessed(refundId) {
    try {
      const res = await fetch(`/api/finance/refunds/${refundId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PROCESSED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed");
        return;
      }
      setList((prev) =>
        prev.map((cn) => ({
          ...cn,
          refunds: (cn.refunds || []).map((r) =>
            r.id === refundId ? data : r
          ),
        }))
      );
    } catch (e) {
      alert("Failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#0b69a3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Credit Notes & Refunds</h1>
              <p className="text-gray-600 text-sm mt-1">Issue credit notes and process refunds</p>
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Issue Credit Note</h2>
          <form onSubmit={createCreditNote} className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
              <select
                className="w-full border p-2 rounded"
                value={form.invoiceId}
                onChange={(e) => setForm((f) => ({ ...f, invoiceId: e.target.value }))}
                required
              >
                <option value="">Select invoice</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number || inv.id} — ₹{Number(inv.totalAmount || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="w-full border p-2 rounded"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                placeholder="Return, cancellation, adjustment"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#0b69a3] text-white rounded-lg hover:bg-[#095a8f] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Credit Note"}
            </button>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Credit Notes</div>
          <div className="overflow-x-auto">
            {list.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No credit notes yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 border-b">Number</th>
                    <th className="p-3 border-b">Invoice</th>
                    <th className="p-3 border-b">Amount</th>
                    <th className="p-3 border-b">Reason</th>
                    <th className="p-3 border-b">Refunds</th>
                    <th className="p-3 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((cn) => {
                    const processedSum = (cn.refunds || []).filter((r) => r.status === "PROCESSED").reduce((s, r) => s + r.amount, 0);
                    const pendingRefunds = (cn.refunds || []).filter((r) => r.status === "PENDING");
                    const canRefund = processedSum < cn.amount;
                    return (
                      <tr key={cn.id} className="border-b border-gray-100">
                        <td className="p-3 font-medium">{cn.number}</td>
                        <td className="p-3">
                          <a href={`/invoice/${cn.invoice?.id}`} className="text-[#0b69a3] hover:underline">
                            {cn.invoice?.number || cn.invoiceId}
                          </a>
                        </td>
                        <td className="p-3">₹{Number(cn.amount).toLocaleString("en-IN")}</td>
                        <td className="p-3 text-gray-600">{cn.reason || "—"}</td>
                        <td className="p-3">
                          {(cn.refunds || []).map((r) => (
                            <div key={r.id} className="flex items-center gap-2">
                              ₹{r.amount.toLocaleString("en-IN")} — {r.status}
                              {r.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => markRefundProcessed(r.id)}
                                  className="text-xs px-2 py-0.5 bg-green-600 text-white rounded"
                                >
                                  Mark processed
                                </button>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="p-3">
                          {canRefund && (
                            <button
                              type="button"
                              onClick={() => {
                                const amt = cn.amount - processedSum;
                                if (amt > 0 && confirm(`Create refund for ₹${amt.toLocaleString("en-IN")}?`)) {
                                  createRefund(cn.id, amt);
                                }
                              }}
                              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Create refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

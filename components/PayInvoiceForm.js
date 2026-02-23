import { useState, useEffect } from "react";
import { showToast } from "./Toast";
import { formatISTDate } from "../lib/dateUtils";

export default function PayInvoiceForm({ invoiceId, invoice }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(invoice || null);

  useEffect(() => {
    // Fetch invoice data if not provided
    if (!invoiceData && invoiceId) {
      fetch(`/api/invoices/${invoiceId}`, { credentials: "include" })
        .then(res => {
          if (!res.ok) {
            throw new Error("Failed to fetch invoice");
          }
          return res.json();
        })
        .then(data => setInvoiceData(data))
        .catch(err => {
          console.error("Error fetching invoice:", err);
          showToast("Failed to load invoice details", "error");
        });
    }
  }, [invoiceId, invoiceData, invoice]);

  // Calculate remaining amount
  const totalAmount = invoiceData?.totalAmount || 0;
  const paidAmount = invoiceData?.payments
    ?.filter(p => p.verified)
    .reduce((sum, p) => sum + p.amount, 0) || 0;
  const remainingAmount = totalAmount - paidAmount;
  const paymentTerm = invoiceData?.paymentTerm || "NET_30";

  // Calculate due date based on payment term
  const paymentTermDays = {
    NET_30: 30,
    NET_60: 60,
    NET_90: 90,
  };

  const invoiceDate = invoiceData?.createdAt ? new Date(invoiceData.createdAt) : new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + (paymentTermDays[paymentTerm] || 30));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);
  
  const isOverdue = dueDateOnly < today;
  const daysUntilDue = Math.ceil((dueDateOnly - today) / (1000 * 60 * 60 * 24));
  const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0;

  // Set amount to remaining amount when invoice data loads
  useEffect(() => {
    if (invoiceData && remainingAmount > 0) {
      setAmount(remainingAmount.toFixed(2));
    }
  }, [invoiceData, remainingAmount]);

  async function submitPayment() {
    if (!file) {
      showToast("Please upload payment proof", "error");
      return;
    }

    const paymentAmount = Number(amount);
    
    // Validate exact payment amount
    if (Math.abs(paymentAmount - remainingAmount) > 0.01) {
      showToast(`Payment amount must be exactly ₹${remainingAmount.toFixed(2)} (remaining amount). Payment terms: ${paymentTerm.replace("NET_", "Net ")}`, "error");
      return;
    }

    if (paymentAmount <= 0) {
      showToast("Payment amount must be greater than 0", "error");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("invoiceId", invoiceId);
      formData.append("file", file);

      const uploadRes = await fetch("/api/uploads/payment-proof", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const { proofUrl } = await uploadRes.json();

      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: paymentAmount,
          mode,
          proofUrl,
        }),
      });

      if (!paymentRes.ok) {
        const err = await paymentRes.json().catch(() => ({}));
        throw new Error(err.error || "Payment submission failed");
      }

      showToast("Payment submitted successfully", "success");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast("Failed to submit payment: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (!invoiceData) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
        Loading invoice details...
      </div>
    );
  }

  if (remainingAmount <= 0) {
    return (
      <div className="mt-4 p-4 bg-green-50 rounded-lg text-center text-sm text-green-700 font-medium">
        ✓ Invoice fully paid
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
      <div className="font-medium text-sm text-gray-900">Upload Payment Proof</div>
      
      {/* Payment Term Info */}
      <div className={`border rounded-lg p-3 text-xs ${isOverdue ? 'bg-red-50 border-red-300' : daysUntilDue <= 7 ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-200'}`}>
        <div className="font-medium mb-2" style={{ color: isOverdue ? '#991b1b' : daysUntilDue <= 7 ? '#92400e' : '#1e3a8a' }}>
          Payment Terms: {paymentTerm.replace("NET_", "Net ")}
        </div>
        <div className="space-y-1.5">
          <div style={{ color: isOverdue ? '#991b1b' : daysUntilDue <= 7 ? '#92400e' : '#1e40af' }}>
            <span className="font-medium">Due Date:</span>{" "}
            <span className="font-bold">{formatISTDate(dueDate)}</span>
            {isOverdue && (
              <span className="ml-2 text-red-700 font-bold">
                (Overdue by {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'})
              </span>
            )}
            {!isOverdue && daysUntilDue <= 7 && (
              <span className="ml-2 text-yellow-700 font-medium">
                ({daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'} remaining)
              </span>
            )}
            {!isOverdue && daysUntilDue > 7 && (
              <span className="ml-2 text-gray-600">
                ({daysUntilDue} days remaining)
              </span>
            )}
          </div>
          <div style={{ color: isOverdue ? '#991b1b' : daysUntilDue <= 7 ? '#92400e' : '#1e40af' }}>
            <span className="font-medium">Remaining Amount:</span>{" "}
            <span className="font-bold">₹{remainingAmount.toFixed(2)}</span>
          </div>
          <div className="text-gray-700 mt-1 pt-1 border-t" style={{ borderColor: isOverdue ? '#fca5a5' : daysUntilDue <= 7 ? '#fde68a' : '#bfdbfe' }}>
            You must pay exactly ₹{remainingAmount.toFixed(2)} (no more, no less)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={remainingAmount.toFixed(2)}
            required
            readOnly
            style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
          />
          <p className="text-xs text-gray-500 mt-1">Fixed amount: ₹{remainingAmount.toFixed(2)}</p>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Payment Mode</label>
          <select
            className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option>NEFT</option>
            <option>RTGS</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Bank Transfer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Payment Proof (Image/PDF)</label>
        <input
          type="file"
          className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onChange={(e) => setFile(e.target.files[0])}
          accept="image/*,.pdf"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Upload screenshot or PDF of payment confirmation</p>
      </div>

      <button
        onClick={submitPayment}
        disabled={loading || !file || !amount}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
      >
        {loading ? "Submitting..." : `Submit Payment of ₹${remainingAmount.toFixed(2)}`}
      </button>
    </div>
  );
}

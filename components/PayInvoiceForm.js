import { useState } from "react";

export default function PayInvoiceForm({ invoiceId }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [file, setFile] = useState(null);

  async function submitPayment() {
    if (!file) {
      alert("Upload payment proof");
      return;
    }

    const formData = new FormData();
    formData.append("invoiceId", invoiceId);
    formData.append("file", file);

    try {
      const uploadRes = await fetch("/api/uploads/payment-proof", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const { proofUrl } = await uploadRes.json();

      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: Number(amount),
          mode,
          proofUrl,
        }),
      });

      if (!paymentRes.ok) {
        throw new Error("Payment submission failed");
      }

      alert("Payment submitted successfully");
      window.location.reload();
    } catch (error) {
      alert("Failed to submit payment: " + error.message);
    }

    alert("Payment submitted");
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
      <div className="font-medium text-sm">Upload Payment Proof</div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          step="0.01"
          className="border p-2 rounded"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <select
          className="border p-2 rounded"
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

      <input
        type="file"
        className="border p-2 rounded w-full"
        onChange={(e) => setFile(e.target.files[0])}
        accept="image/*,.pdf"
        required
      />

      <button
        onClick={submitPayment}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Submit Payment
      </button>
    </div>
  );
}

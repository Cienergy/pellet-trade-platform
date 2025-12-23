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

    const uploadRes = await fetch("/api/uploads/payment-proof", {
      method: "POST",
      body: formData,
    });

    const { proofUrl } = await uploadRes.json();

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        amount: Number(amount),
        mode,
        proofUrl,
      }),
    });

    alert("Payment submitted");
  }

  return (
    <div style={{ marginTop: 8 }}>
      <input
        placeholder="Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      <select value={mode} onChange={e => setMode(e.target.value)}>
        <option>NEFT</option>
        <option>RTGS</option>
        <option>UPI</option>
      </select>

      <input type="file" onChange={e => setFile(e.target.files[0])} />

      <button onClick={submitPayment}>Submit Payment</button>
    </div>
  );
}

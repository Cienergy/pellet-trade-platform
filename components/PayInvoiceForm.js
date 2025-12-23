import { useState } from "react";

export default function PayInvoiceForm({ invoiceId }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("NEFT");

  async function submitPayment() {
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        amount: Number(amount),
        mode,
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
        <option value="NEFT">NEFT</option>
        <option value="RTGS">RTGS</option>
        <option value="UPI">UPI</option>
      </select>

      <button onClick={submitPayment}>Pay Invoice</button>
    </div>
  );
}

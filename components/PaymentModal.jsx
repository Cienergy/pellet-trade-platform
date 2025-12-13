import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PaymentModal({
  orderId,
  depositSchedule = [],
  installmentSchedule = [],
  onClose,
  onSaved
}) {
  const [mounted, setMounted] = useState(false);
  const [paymentType, setPaymentType] = useState("full");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [amount, setAmount] = useState("");
  const [depositNo, setDepositNo] = useState(null);
  const [installmentNo, setInstallmentNo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pendingDeposits = depositSchedule.filter(d => !d.paid);
  const pendingInstallments = installmentSchedule.filter(i => !i.paid);

  useEffect(() => {
    if (paymentType === "deposit" && depositNo != null) {
      const d = pendingDeposits.find(x => x.deposit_no === Number(depositNo));
      if (d) setAmount(d.amount);
    }
    if (paymentType === "installment" && installmentNo != null) {
      const i = pendingInstallments.find(x => x.installment_no === Number(installmentNo));
      if (i) setAmount(i.amount);
    }
  }, [paymentType, depositNo, installmentNo]);

  async function submitPayment() {
    if (!amount) return alert("Enter amount");
    if (paymentType === "deposit" && depositNo == null) return alert("Select deposit");
    if (paymentType === "installment" && installmentNo == null) return alert("Select installment");

    setSaving(true);

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        amount: Number(amount),
        payment_type: paymentType,
        payment_mode: paymentMode,
        deposit_no: paymentType === "deposit" ? Number(depositNo) : null,
        installment_no: paymentType === "installment" ? Number(installmentNo) : null
      })
    });

    setSaving(false);
    onSaved();
  }

  if (!mounted) return null;

  return createPortal(
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <h3>Record Payment</h3>

        <label>Payment Type</label>
        <select value={paymentType} onChange={e => {
          setPaymentType(e.target.value);
          setDepositNo(null);
          setInstallmentNo(null);
          setAmount("");
        }}>
          <option value="full">Full Payment</option>
          <option value="deposit">Deposit</option>
          <option value="installment">Installment</option>
        </select>

        {paymentType === "deposit" && (
          <>
            <label>Select Deposit</label>
            <select value={depositNo || ""} onChange={e => setDepositNo(e.target.value)}>
              <option value="">Choose deposit</option>
              {pendingDeposits.map(d => (
                <option key={d.deposit_no} value={d.deposit_no}>
                  Deposit {d.deposit_no} — ₹{d.amount}
                </option>
              ))}
            </select>
          </>
        )}

        {paymentType === "installment" && (
          <>
            <label>Select Installment</label>
            <select value={installmentNo || ""} onChange={e => setInstallmentNo(e.target.value)}>
              <option value="">Choose installment</option>
              {pendingInstallments.map(i => (
                <option key={i.installment_no} value={i.installment_no}>
                  Installment {i.installment_no} — ₹{i.amount}
                </option>
              ))}
            </select>
          </>
        )}

        <label>Amount</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} />

        <label>Payment Mode</label>
        <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
        </select>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={submitPayment} disabled={saving}>
            {saving ? "Saving…" : "Save Payment"}
          </button>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Inline styles (immune to your CSS) ---------- */
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999
};

const boxStyle = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  width: 420,
  maxWidth: "90vw"
};

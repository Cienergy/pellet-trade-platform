// components/Cart.jsx
import { useState } from "react";

export default function Cart({
  cart,
  onRemove,
  onEdit,
  onCheckout,
  estimateTransport,
  transportMode = "truck"
}) {
  const [paymentPlan, setPaymentPlan] = useState("full");
  const [depositAmount, setDepositAmount] = useState("");
  const [installments, setInstallments] = useState(2);

  const subtotal = cart.reduce(
    (s, c) => s + (Number(c.qty || 0) * Number(c.pricePerKg || 0)),
    0
  );

  const transport = estimateTransport(transportMode);
  const tax = Math.round((subtotal + transport) * 0.12);
  const total = subtotal + transport + tax;

  function handleCheckout() {
    const payload = {
      paymentPlan,
      depositAmount: paymentPlan === "deposit" ? Number(depositAmount || 0) : null,
      installments: paymentPlan === "installment" ? Number(installments || 0) : null,
      transportMethod: transportMode,
      transportCharge: transport
    };

    onCheckout(payload);
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ marginTop: 0 }}>Your cart</h3>

      {/* CART ITEMS */}
      {cart.length === 0 ? (
        <div className="muted">Cart empty</div>
      ) : (
        cart.map((item) => {
          const amount = Number(item.qty) * Number(item.pricePerKg);

          return (
            <div
              key={item.id}
              style={{
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                paddingBottom: 10,
                marginBottom: 14
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{item.name}</strong>
                <strong>₹ {amount.toLocaleString("en-IN")}</strong>
              </div>

              <div className="muted small" style={{ marginBottom: 8 }}>
                {item.qty} kg • ₹ {item.pricePerKg}/kg
              </div>

              {/* Quantity Controls */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="btn ghost"
                  onClick={() => onEdit(item.id, Math.max(0, Number(item.qty) - 100))}
                >
                  –
                </button>
                <span>{item.qty} kg</span>
                <button
                  className="btn ghost"
                  onClick={() => onEdit(item.id, Number(item.qty) + 100)}
                >
                  +
                </button>
                <button className="btn ghost" onClick={() => onRemove(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* PAYMENT PLAN SELECTION — AS REQUESTED */}
      {cart.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>Payment plan</h4>

          <label style={{ display: "block", marginTop: 6 }}>
            <input
              type="radio"
              checked={paymentPlan === "full"}
              onChange={() => setPaymentPlan("full")}
            />{" "}
            Full Payment
          </label>

          <label style={{ display: "block", marginTop: 6 }}>
            <input
              type="radio"
              checked={paymentPlan === "deposit"}
              onChange={() => setPaymentPlan("deposit")}
            />{" "}
            Deposit
          </label>

          {paymentPlan === "deposit" && (
            <input
              type="number"
              className="input"
              placeholder="Deposit amount (₹)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}

          <label style={{ display: "block", marginTop: 6 }}>
            <input
              type="radio"
              checked={paymentPlan === "installment"}
              onChange={() => setPaymentPlan("installment")}
            />{" "}
            Installments
          </label>

          {paymentPlan === "installment" && (
            <input
              type="number"
              className="input"
              placeholder="No. of installments"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}

      {/* SUMMARY */}
      <div style={{ marginTop: 20 }}>
        <div className="muted small">Subtotal</div>
        <div>₹ {subtotal.toLocaleString("en-IN")}</div>

        <div className="muted small" style={{ marginTop: 6 }}>
          Transport
        </div>
        <div>₹ {transport.toLocaleString("en-IN")}</div>

        <h3 style={{ marginTop: 10 }}>Total (est)</h3>
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          ₹ {total.toLocaleString("en-IN")}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      {cart.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={handleCheckout}>
            Place order
          </button>

          <button
            className="btn ghost"
            onClick={() => {
              localStorage.removeItem("pn_cart_v2");
              window.location.reload();
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

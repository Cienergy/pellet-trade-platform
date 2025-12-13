// pages/orders.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import PaymentModal from "../components/PaymentModal";

function formatINR(v = 0) {
  return "₹ " + Number(v).toLocaleString("en-IN");
}

<button
  className="btn"
  onClick={() => setShowPayment(true)}
>
  Manage Payment
</button>



function getStatus(totals) {
  if (!totals) return "pending";
  if (totals.outstanding === 0) return "paid";
  if (totals.paid > 0) return "partial";
  return "pending";
}

export default function OrdersPage() {
  const router = useRouter();
  const { highlight } = router.query;

  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  // ================= LOAD ORDERS =================
  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setOrders(arr);

      if (highlight && arr.find(o => String(o.id) === String(highlight))) {
        setSelectedId(highlight);
      } else if (!selectedId && arr.length) {
        setSelectedId(arr[0].id);
      }
    } catch (e) {
      console.error("Failed to load orders", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrders(); }, []);
  useEffect(() => { if (highlight) setSelectedId(highlight); }, [highlight]);

  const order = orders.find(o => String(o.id) === String(selectedId));
  const totals = order?.totals || { subtotal: 0, paid: 0, outstanding: 0 };
  const status = getStatus(totals);

  return (
    <div className="app-container">
      {/* ================= PAGE HEADER ================= */}
      <div className="page-header">
        <h1>Orders</h1>
        <p className="muted">
          Track orders, manage payments, download invoices & receipts
        </p>
      </div>

      <div className="orders-grid">
        {/* ================= LEFT: ORDER LIST ================= */}
        <div className="card">
          <h3>All Orders</h3>

          {loading && <div className="muted">Loading…</div>}
          {!loading && orders.length === 0 && (
            <div className="muted">No orders found</div>
          )}

          {!loading && orders.map(o => (
            <div
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={`card-item ${o.id === selectedId ? "selected" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <div>
                <strong>
                  {String(o.id).slice(0, 6)}…
                  {String(o.id).slice(-4)}
                </strong>
                <div className="small muted">{o.region || "—"}</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong>{formatINR(o.totals?.subtotal)}</strong>
                <div className={`badge ${getStatus(o.totals)}`}>
                  {getStatus(o.totals)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ================= CENTER: ORDER DETAILS ================= */}
        <div className="card">
          {!order ? (
            <div className="muted">Select an order to view details</div>
          ) : (
            <>
              {/* HEADER */}
              <div className="order-head">
                <div>
                  <h2 style={{ margin: 0 }}>
                    Order {String(order.id).slice(0, 6)}…
                  </h2>
                  <span className={`badge ${status}`}>{status}</span>
                  <div className="muted">
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>

                <button
                  className="btn ghost"
                  onClick={() =>
                    window.open(
                      `/api/orders/${order.id}/invoice`,
                      "_blank"
                    )
                  }
                >
                  Download Invoice
                </button>
              </div>

              {/* ITEMS */}
              <h3>Items</h3>
              {order.items?.map((i, idx) => (
                <div key={idx} className="item-mini">
                  <div>
                    <strong>{i.name}</strong>
                    <div className="small muted">
                      {i.qty} kg × ₹{i.pricePerKg}
                    </div>
                  </div>
                  <strong>{formatINR(i.qty * i.pricePerKg)}</strong>
                </div>
              ))}

              {/* PAYMENTS + TIMELINE */}
              <h3 style={{ marginTop: 24 }}>Payments</h3>

              {order.payments?.length === 0 && (
                <div className="muted">No payments recorded yet</div>
              )}

              <div className="timeline">
                {order.payments?.map(p => (
                  <div key={p.id} className="timeline-item">
                    <strong>{formatINR(p.amount)}</strong>
                    <div className="small muted">
                      {p.payment_mode || p.mode || "payment"} •{" "}
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>

                    {/* ===== RECEIPT: ALWAYS SHOWN IF PAYMENT EXISTS ===== */}
                    {p.id && (
                      <a
                        className="btn ghost"
                        href={`/api/payments/${p.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginTop: 6 }}
                      >
                        Download Receipt
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* MANAGE PAYMENT */}
              {totals.outstanding > 0 && (
                <button
                  className="btn"
                  style={{ marginTop: 20 }}
                  onClick={() => setShowPayment(true)}
                >
                  Manage Payment
                </button>
              )}
            </>
          )}
        </div>

        {/* ================= RIGHT: SUMMARY ================= */}
        <div className="card summary">
          <h3>Summary</h3>

          <div className="row">
            <span>Subtotal</span>
            <strong>{formatINR(totals.subtotal)}</strong>
          </div>

          <div className="row">
            <span>Paid</span>
            <strong>{formatINR(totals.paid)}</strong>
          </div>

          <div className="row">
            <span>Outstanding</span>
            <strong
              style={{
                color:
                  totals.outstanding > 0
                    ? "var(--warning)"
                    : "var(--success)",
              }}
            >
              {formatINR(totals.outstanding)}
            </strong>
          </div>

          <button
            className="btn ghost"
            style={{ width: "100%", marginTop: 16 }}
            onClick={() => router.push("/create-order")}
          >
            Create New Order
          </button>
        </div>
      </div>

      {/* ================= PAYMENT MODAL ================= */}
      {showPayment && order && (
  <PaymentModal
    orderId={order.id}
    depositSchedule={order.deposit_schedule || []}
    installmentSchedule={order.installment_schedule || []}
    onClose={() => setShowPayment(false)}
    onSaved={() => {
      setShowPayment(false);
      loadOrders();
    }}
  />
)}

    </div>
  );
}

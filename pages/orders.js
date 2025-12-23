import { useEffect, useState } from "react";
import InvoiceBlock from "../components/InvoiceBlock";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    fetch("/api/orders")
      .then(res => res.json())
      .then(setOrders);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Orders</h1>

      {orders.map(order => (
        <div
          key={order.id}
          style={{ border: "1px solid #ccc", marginBottom: 12, padding: 12 }}
        >
          {/* ORDER ROW */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div><strong>Order ID:</strong> {order.id}</div>
              <div>Type: {order.type}</div>
              <div>Status: {order.status}</div>
              <div>
                Created: {new Date(order.createdAt).toLocaleDateString()}
              </div>
            </div>

            <button
              onClick={() =>
                setExpandedOrderId(
                  expandedOrderId === order.id ? null : order.id
                )
              }
            >
              {expandedOrderId === order.id ? "Hide" : "View"}
            </button>
          </div>

          {/* BATCHES */}
          {expandedOrderId === order.id && (
            <div style={{ marginTop: 12, paddingLeft: 20 }}>
              {order.batches.map(batch => (
                <div
                  key={batch.id}
                  style={{ marginBottom: 10, paddingBottom: 10 }}
                >
                  <div>
                    <strong>Batch</strong>
                  </div>
                  <div>Product: {batch.product.grade}</div>
                  <div>Quantity: {batch.quantityMT} MT</div>
                  <div>
                    Delivery:{" "}
                    {batch.deliveryAt
                      ? new Date(batch.deliveryAt).toLocaleDateString()
                      : "Immediate"}
                  </div>

                  <InvoiceBlock invoice={batch.invoice} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

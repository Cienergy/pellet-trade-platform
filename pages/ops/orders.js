import { useEffect, useState } from "react";

export default function OpsOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();

        // 🔒 HARD NORMALIZATION (this is the real fix)
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (Array.isArray(data?.orders)) {
          setOrders(data.orders);
        } else {
          setOrders([]);
          if (data?.error) setError(data.error);
        }
      })
      .catch((err) => {
        console.error("Orders fetch failed:", err);
        setError("Failed to load orders");
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ---------- RENDER GUARDS ----------

  if (loading) {
    return <div className="p-6">Loading orders…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-6 text-gray-500">
        No orders found.
      </div>
    );
  }

  // ---------- SAFE RENDER ----------

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Operations – Orders</h1>

      {orders.map((o) => (
        <div key={o.id} className="border p-4 rounded">
          <div className="font-medium">
            Order #{o.id?.slice(0, 8)}
          </div>

          {Array.isArray(o.batches) && o.batches.map((b) => (
            <div key={b.id} className="mt-2 text-sm">
              {b.product?.name ?? "Unknown product"} — {b.quantityMT} MT
              <div className="text-gray-500">
                Delivery: {b.deliveryAt || "Not scheduled"}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

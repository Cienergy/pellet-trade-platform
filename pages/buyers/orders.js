import { useEffect, useState } from "react";

export default function BuyerOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch("/api/orders", { credentials: "include" })
      .then(res => res.json())
      .then(setOrders);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Orders</h1>

      {orders.map(o => (
        <div key={o.id} className="border p-4 rounded">
          <div className="text-sm text-gray-500">
            Order #{o.id.slice(0, 8)}
          </div>

          {o.batches.map(b => (
            <div key={b.id} className="mt-2 text-sm">
              {b.product.name} — {b.quantityMT} MT  
              {b.invoice && (
                <div className="text-green-700">
                  Invoice: {b.invoice.number}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

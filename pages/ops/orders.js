import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function OpsOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [batchForm, setBatchForm] = useState({
    productId: "",
    siteId: "",
    quantityMT: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/products", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/admin/sites", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([ords, prods, sts]) => {
      if (ords) setOrders(ords);
      if (prods) setProducts(prods);
      if (sts) setSites(sts);
      setLoading(false);
    });
  }, []);

  async function createBatch(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);

    const res = await fetch(
      `/api/orders/${selectedOrder.id}/batches`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchForm),
      }
    );

    if (res.ok) {
      const newBatch = await res.json();
      setOrders((ords) =>
        ords.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, batches: [...(o.batches || []), newBatch] }
            : o
        )
      );
      setBatchForm({ productId: "", siteId: "", quantityMT: "" });
      setSelectedOrder(null);
      alert("Batch created successfully");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to create batch");
    }

    setSubmitting(false);
  }

  async function updateOrderStatus(orderId, status) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setOrders((ords) =>
        ords.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    } else {
      alert("Failed to update order status");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Manage Orders</h1>
            <p className="text-gray-600 mt-1">View and batch orders</p>
          </div>
          <Link
            href="/ops/dashboard"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border p-6 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">
                      Order #{order.id.slice(0, 8)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Organization: {order.org?.name || "-"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Created: {new Date(order.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-3 py-1 rounded text-sm ${
                          order.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : order.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "CREATED" && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, "IN_PROGRESS")}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Start Processing
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                        >
                          Add Batch
                        </button>
                      </>
                    )}
                    {order.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>

                {order.batches && order.batches.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="font-medium mb-2">Batches</div>
                    <div className="space-y-2">
                      {order.batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="bg-gray-50 p-3 rounded text-sm"
                        >
                          <div className="flex justify-between">
                            <span>
                              {batch.product?.name || "-"} - {batch.quantityMT} MT
                            </span>
                            <span className="text-gray-600">
                              Site: {batch.site?.name || "-"} | Status: {batch.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Batch Creation Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Create Batch</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={createBatch} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Product
                  </label>
                  <select
                    className="w-full border p-2 rounded"
                    value={batchForm.productId}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, productId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Site
                  </label>
                  <select
                    className="w-full border p-2 rounded"
                    value={batchForm.siteId}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, siteId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Quantity (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border p-2 rounded"
                    value={batchForm.quantityMT}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, quantityMT: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create Batch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

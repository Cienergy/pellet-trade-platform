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
    loadData();
  }, []);

  async function loadData() {
    Promise.all([
      fetch("/api/orders", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/products", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/admin/sites", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([ords, prods, sts]) => {
      if (Array.isArray(ords)) setOrders(ords);
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(sts)) setSites(sts);
      setLoading(false);
    }).catch((err) => {
      console.error("Error loading data:", err);
      setLoading(false);
    });
  }

  async function createBatch(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);

    try {
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
        await loadData(); // Reload all data
        setBatchForm({ productId: "", siteId: "", quantityMT: "" });
        setSelectedOrder(null);
        alert("Batch created successfully. Invoice auto-generated.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to create batch");
      }
    } catch (error) {
      console.error("Error creating batch:", error);
      alert("Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeBatch(batchId) {
    if (!confirm("Mark this batch as completed?")) return;

    try {
      const res = await fetch(`/api/batches/${batchId}/complete`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        await loadData(); // Reload all data
        if (data.orderCompleted) {
          alert("Batch completed! All batches are done - Order marked as COMPLETED.");
        } else {
          alert("Batch marked as completed.");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to complete batch");
      }
    } catch (error) {
      console.error("Error completing batch:", error);
      alert("Failed to complete batch");
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await loadData(); // Reload all data
      } else {
        alert("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div>Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Manage Orders
            </h1>
            <p className="text-gray-600 mt-1">View and batch orders</p>
          </div>
          <Link
            href="/ops/dashboard"
            className="px-4 py-2 border rounded hover:bg-gray-50 transition"
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
                className="bg-white rounded-xl border p-6 space-y-4 shadow-sm hover:shadow-md transition"
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
                        className={`inline-block px-3 py-1 rounded text-sm font-medium ${
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
                    {(order.status === "CREATED" || order.status === "IN_PROGRESS") && (
                      <>
                        {order.status === "CREATED" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "IN_PROGRESS")}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 transition"
                          >
                            Start Processing
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 transition"
                        >
                          Add Batch
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {order.batches && order.batches.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="font-medium mb-3">Batches</div>
                    <div className="space-y-3">
                      {order.batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="bg-gray-50 p-4 rounded-lg border"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium">
                                {batch.product?.name || "-"} - {batch.quantityMT} MT
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Site: {batch.site?.name || "-"}
                              </div>
                              {batch.invoice && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Invoice: {batch.invoice.number} | ₹{batch.invoice.totalAmount.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  batch.status === "PAID"
                                    ? "bg-green-100 text-green-800"
                                    : batch.status === "INVOICED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {batch.status}
                              </span>
                              {batch.status !== "PAID" && (
                                <button
                                  onClick={() => completeBatch(batch.id)}
                                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 transition text-sm"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
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
            <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Create Batch</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={createBatch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={batchForm.productId}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, productId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Product</option>
                    {Array.isArray(products) && products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site
                  </label>
                  <select
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={batchForm.siteId}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, siteId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Site</option>
                    {Array.isArray(sites) && sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={batchForm.quantityMT}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, quantityMT: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition"
                  >
                    {submitting ? "Creating..." : "Create Batch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 border rounded hover:bg-gray-50 transition"
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

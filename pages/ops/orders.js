import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { showToast } from "../../components/Toast";

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
    deliveryAt: "",
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
        setBatchForm({ productId: "", siteId: "", quantityMT: "", deliveryAt: "" });
        setSelectedOrder(null);
        showToast("Batch created successfully. Invoice auto-generated.", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to create batch", "error");
      }
    } catch (error) {
      console.error("Error creating batch:", error);
      showToast("Failed to create batch", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function startBatch(batchId) {
    try {
      const res = await fetch(`/api/batches/${batchId}/start`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        await loadData();
        showToast("Batch processing started successfully", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to start batch processing", "error");
      }
    } catch (error) {
      console.error("Error starting batch:", error);
      showToast("Failed to start batch processing", "error");
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
          showToast("Batch completed! All batches are done - Order marked as COMPLETED.", "success");
        } else {
          showToast("Batch marked as completed successfully", "success");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to complete batch", "error");
      }
    } catch (error) {
      console.error("Error completing batch:", error);
      showToast("Failed to complete batch", "error");
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
        showToast("Order status updated successfully", "success");
      } else {
        showToast("Failed to update order status", "error");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      showToast("Failed to update order status", "error");
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
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        #{order.id.slice(0, 6).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-gray-900">
                          Order Details
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.org?.name || "-"} · {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Quantity Progress */}
                    {(() => {
                      const requestedMT = order.requestedQuantityMT || order.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
                      const batchedMT = order.batchedMT || order.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
                      const remainingMT = order.remainingMT !== undefined ? order.remainingMT : Math.max(0, requestedMT - batchedMT);
                      const batchingProgress = requestedMT > 0 ? (batchedMT / requestedMT) * 100 : 0;
                      
                      return (
                        <div className="mt-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-gray-600 mb-1">Requested Quantity</div>
                                <div className="text-lg font-bold text-indigo-700">
                                  {requestedMT.toFixed(2)} MT
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-600 mb-1">Batched</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {batchedMT.toFixed(2)} MT
                                </div>
                              </div>
                            </div>
                            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(batchingProgress, 100)}%` }}
                              ></div>
                            </div>
                            {remainingMT > 0 ? (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-orange-600 font-medium">Remaining to Batch</span>
                                <span className="text-sm font-bold text-orange-600">{remainingMT.toFixed(2)} MT</span>
                              </div>
                            ) : (
                              <div className="text-xs text-green-600 font-medium text-center">
                                ✓ All quantity batched
                              </div>
                            )}
                            {order.totalAmount > 0 && (
                              <div className="pt-2 border-t border-indigo-200">
                                <div className="text-xs text-gray-600 mb-1">Total Order Value</div>
                                <div className="text-lg font-bold text-indigo-700">
                                  ₹{order.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${
                          order.status === "COMPLETED"
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                            : order.status === "IN_PROGRESS"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                            : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                        } shadow-sm`}
                      >
                        <div className="w-2 h-2 rounded-full bg-white/30"></div>
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
                              <div className="flex items-center gap-2 mb-2">
                                <div className="font-semibold text-gray-900">
                                  {batch.product?.name || "-"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {batch.quantityMT.toFixed(2)} MT
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                Site: {batch.site?.name || "-"}
                              </div>
                              {batch.deliveryAt && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Delivery: {new Date(batch.deliveryAt).toLocaleDateString()}
                                </div>
                              )}
                              {batch.invoice && (
                                <div className="mt-2 bg-indigo-50 rounded px-2 py-1 inline-block">
                                  <div className="text-xs font-medium text-indigo-700">
                                    Invoice #{batch.invoice.number}
                                  </div>
                                  <div className="text-sm font-bold text-indigo-900">
                                    ₹{batch.invoice.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  batch.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : batch.status === "IN_PROGRESS"
                                    ? "bg-blue-100 text-blue-800"
                                    : batch.status === "PAYMENT_APPROVED"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : batch.status === "INVOICED"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {batch.status}
                              </span>
                              {batch.status === "PAYMENT_APPROVED" && (
                                <button
                                  onClick={() => startBatch(batch.id)}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 transition text-sm"
                                >
                                  Start Processing
                                </button>
                              )}
                              {batch.status === "IN_PROGRESS" && (
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
        {selectedOrder && (() => {
          const requestedMT = selectedOrder.requestedQuantityMT || selectedOrder.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
          const batchedMT = selectedOrder.batchedMT || selectedOrder.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
          const remainingMT = selectedOrder.remainingMT !== undefined ? selectedOrder.remainingMT : Math.max(0, requestedMT - batchedMT);
          
          return (
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

                {/* Remaining Quantity Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Order Quantity</span>
                    <span className="text-sm font-bold text-blue-700">{requestedMT.toFixed(2)} MT</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Already Batched</span>
                    <span className="text-sm font-semibold text-gray-900">{batchedMT.toFixed(2)} MT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-700">Remaining</span>
                    <span className="text-lg font-bold text-orange-600">{remainingMT.toFixed(2)} MT</span>
                  </div>
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
                    max={remainingMT}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={batchForm.quantityMT}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, quantityMT: e.target.value })
                    }
                    required
                  />
                  {remainingMT > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {remainingMT.toFixed(2)} MT remaining
                    </p>
                  )}
                  {remainingMT === 0 && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      ⚠️ All quantity has been batched
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={batchForm.deliveryAt}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, deliveryAt: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || remainingMT === 0}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
          );
        })()}
      </div>
    </div>
  );
}

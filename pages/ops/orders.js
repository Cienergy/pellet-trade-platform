import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { showToast } from "../../components/Toast";
import { ClipboardIcon, CheckCircleIcon, XCircleIcon, PackageIcon, FactoryIcon, ArrowRightIcon } from "../../components/Icons";

export default function OpsOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
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
    try {
      const [ordersRes, productsRes, sitesRes] = await Promise.all([
        fetch("/api/orders", { credentials: "include" }),
        fetch("/api/admin/products", { credentials: "include" }),
        fetch("/api/admin/sites", { credentials: "include" }),
      ]);

      let ordersData = [];
      if (ordersRes.ok) {
        ordersData = await ordersRes.json();
      }

      let productsData = [];
      if (productsRes.ok) {
        productsData = await productsRes.json();
        if (Array.isArray(productsData)) {
          productsData = productsData.filter(p => p.active !== false);
        }
      }

      let sitesData = [];
      if (sitesRes.ok) {
        sitesData = await sitesRes.json();
        if (Array.isArray(sitesData)) {
          sitesData = sitesData.filter(s => s.active !== false);
        }
      }

      if (Array.isArray(ordersData)) setOrders(ordersData);
      if (Array.isArray(productsData)) setProducts(productsData);
      if (Array.isArray(sitesData)) setSites(sitesData);
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      showToast("Failed to load data. Please refresh the page.", "error");
      setLoading(false);
    }
  }

  async function acceptOrder(orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        await loadData();
        showToast("Order accepted successfully", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to accept order", "error");
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      showToast("Failed to accept order", "error");
    }
  }

  async function rejectOrder(orderId) {
    if (!rejectReason.trim()) {
      showToast("Please provide a reason for rejection", "error");
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (res.ok) {
        await loadData();
        setShowRejectModal(false);
        setRejectReason("");
        setSelectedOrder(null);
        showToast("Order rejected successfully", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to reject order", "error");
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      showToast("Failed to reject order", "error");
    }
  }

  async function createBatch(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/batches`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchForm),
      });

      if (res.ok) {
        await loadData();
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
    if (!confirm("Mark this batch as completed and left from site?")) return;

    try {
      const res = await fetch(`/api/batches/${batchId}/complete`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leftFromSite: true }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadData();
        if (data.orderCompleted) {
          showToast("Batch completed! All batches done - Order marked as COMPLETED.", "success");
        } else {
          showToast("Batch marked as completed and left from site", "success");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#0b69a3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === "PENDING_APPROVAL");
  const acceptedOrders = orders.filter(o => o.status === "ACCEPTED");
  const otherOrders = orders.filter(o => !["PENDING_APPROVAL", "ACCEPTED"].includes(o.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Orders</h1>
              <p className="text-gray-600 text-sm mt-1">Review, accept, and batch orders</p>
            </div>
            <Link
              href="/ops/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Pending Approval Orders */}
        {pendingOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              Pending Approval ({pendingOrders.length})
            </h2>
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={() => acceptOrder(order.id)}
                  onReject={() => {
                    setSelectedOrder(order);
                    setShowRejectModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Accepted Orders */}
        {acceptedOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              Accepted Orders ({acceptedOrders.length})
            </h2>
            <div className="space-y-4">
              {acceptedOrders.map((order) => (
                <AcceptedOrderCard
                  key={order.id}
                  order={order}
                  products={products}
                  sites={sites}
                  onAddBatch={() => setSelectedOrder(order)}
                  onStartBatch={startBatch}
                  onCompleteBatch={completeBatch}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Orders */}
        {otherOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Orders ({otherOrders.length})</h2>
            <div className="space-y-4">
              {otherOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>

      {/* Reject Order Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Reject Order</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setSelectedOrder(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Order #{selectedOrder.id.slice(0, 8)} from {selectedOrder.org?.name || "Unknown"}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#0b69a3] focus:border-[#0b69a3]"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a clear reason for rejecting this order..."
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => rejectOrder(selectedOrder.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Reject Order
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Creation Modal */}
      {selectedOrder && selectedOrder.status === "ACCEPTED" && !showRejectModal && (
        <BatchModal
          order={selectedOrder}
          products={products}
          sites={sites}
          batchForm={batchForm}
          setBatchForm={setBatchForm}
          onSubmit={createBatch}
          onClose={() => {
            setSelectedOrder(null);
            setBatchForm({ productId: "", siteId: "", quantityMT: "", deliveryAt: "" });
          }}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function OrderCard({ order, onAccept, onReject }) {
  const isPending = order.status === "PENDING_APPROVAL";
  const isRejected = order.status === "REJECTED";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#0b69a3] bg-opacity-10 text-[#0b69a3] flex items-center justify-center font-semibold text-sm">
              #{order.id.slice(0, 6)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{order.org?.name || "Unknown Organization"}</div>
              <div className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()} · {order.deliveryLocation || "No delivery location"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Requested Quantity</div>
              <div className="text-lg font-bold text-gray-900">{order.requestedQuantityMT?.toFixed(2) || "0.00"} MT</div>
            </div>
            {order.notes && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Notes</div>
                <div className="text-sm text-gray-700">{order.notes}</div>
              </div>
            )}
          </div>

          {isRejected && order.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <div className="text-xs font-medium text-red-700 mb-1">Rejection Reason</div>
              <div className="text-sm text-red-900">{order.rejectionReason}</div>
            </div>
          )}

          <div className="mt-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isPending ? "bg-yellow-100 text-yellow-800" :
              isRejected ? "bg-red-100 text-red-800" :
              order.status === "ACCEPTED" ? "bg-green-100 text-green-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {order.status}
            </span>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={onAccept}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AcceptedOrderCard({ order, products, sites, onAddBatch, onStartBatch, onCompleteBatch }) {
  const requestedMT = order.requestedQuantityMT || 0;
  const batchedMT = order.batchedMT || order.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
  const remainingMT = order.remainingMT !== undefined ? order.remainingMT : Math.max(0, requestedMT - batchedMT);
  const progress = requestedMT > 0 ? (batchedMT / requestedMT) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
              #{order.id.slice(0, 6)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{order.org?.name || "Unknown"}</div>
              <div className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()} · {order.deliveryLocation || "No location"}
              </div>
            </div>
          </div>

          {/* Quantity Progress */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Requested</span>
              <span className="text-sm font-bold text-gray-900">{requestedMT.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Batched</span>
              <span className="text-sm font-bold text-gray-900">{batchedMT.toFixed(2)} MT</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className="absolute inset-y-0 left-0 h-full bg-[#0b69a3] rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            {remainingMT > 0 ? (
              <div className="text-xs text-orange-600 font-medium">
                Remaining: {remainingMT.toFixed(2)} MT
              </div>
            ) : (
              <div className="text-xs text-green-600 font-medium">✓ All quantity batched</div>
            )}
          </div>
        </div>

        {remainingMT > 0 && (
          <button
            onClick={onAddBatch}
            className="ml-4 px-4 py-2 bg-[#0b69a3] text-white rounded-lg hover:bg-[#095b88] transition text-sm font-medium flex items-center gap-2"
          >
            <PackageIcon className="w-4 h-4" />
            Add Batch
          </button>
        )}
      </div>

      {/* Batches */}
      {order.batches && order.batches.length > 0 && (
        <div className="border-t pt-4">
          <div className="font-medium text-gray-900 mb-3">Batches ({order.batches.length})</div>
          <div className="space-y-3">
            {order.batches.map((batch) => (
              <div key={batch.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-semibold text-gray-900">{batch.product?.name || "Unknown"}</div>
                      <div className="text-sm text-gray-600">{batch.quantityMT.toFixed(2)} MT</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <FactoryIcon className="w-4 h-4 inline mr-1" />
                      {batch.site?.name || "Unknown Site"}
                    </div>
                    {batch.deliveryAt && (
                      <div className="text-xs text-gray-500">
                        Delivery: {new Date(batch.deliveryAt).toLocaleDateString()}
                      </div>
                    )}
                    {batch.invoice && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Invoice:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          #{batch.invoice.number} · ₹{batch.invoice.totalAmount?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      batch.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      batch.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                      batch.status === "PAYMENT_APPROVED" ? "bg-yellow-100 text-yellow-800" :
                      batch.status === "INVOICED" ? "bg-indigo-100 text-indigo-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {batch.status}
                    </span>
                    {batch.status === "PAYMENT_APPROVED" && (
                      <button
                        onClick={() => onStartBatch(batch.id)}
                        className="px-3 py-1.5 bg-[#0b69a3] text-white rounded-lg hover:bg-[#095b88] transition text-xs font-medium"
                      >
                        Start Processing
                      </button>
                    )}
                    {batch.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => onCompleteBatch(batch.id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium"
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
  );
}

function BatchModal({ order, products, sites, batchForm, setBatchForm, onSubmit, onClose, submitting }) {
  const requestedMT = order.requestedQuantityMT || 0;
  const batchedMT = order.batchedMT || order.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
  const remainingMT = Math.max(0, requestedMT - batchedMT);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Create Batch</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Remaining:</span>
            <span className="font-bold text-[#0b69a3]">{remainingMT.toFixed(2)} MT</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#0b69a3] focus:border-[#0b69a3]"
              value={batchForm.productId}
              onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
              required
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#0b69a3] focus:border-[#0b69a3]"
              value={batchForm.siteId}
              onChange={(e) => setBatchForm({ ...batchForm, siteId: e.target.value })}
              required
            >
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.city ? `(${s.city})` : ""}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (MT)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingMT}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#0b69a3] focus:border-[#0b69a3]"
              value={batchForm.quantityMT}
              onChange={(e) => setBatchForm({ ...batchForm, quantityMT: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Max: {remainingMT.toFixed(2)} MT</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#0b69a3] focus:border-[#0b69a3]"
              value={batchForm.deliveryAt}
              onChange={(e) => setBatchForm({ ...batchForm, deliveryAt: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || remainingMT === 0}
              className="flex-1 px-4 py-2 bg-[#0b69a3] text-white rounded-lg hover:bg-[#095b88] disabled:opacity-50 transition font-medium"
            >
              {submitting ? "Creating..." : "Create Batch"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import BatchCard from "./BatchCard";
import { showToast } from "./Toast";
import { formatIST, formatISTDate } from "../lib/dateUtils";

export default function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);

  const requestedMT = order.requestedQuantityMT || order.totalMT || order.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
  const batchedMT = order.batchedMT || order.batches?.reduce((sum, b) => sum + (b.quantityMT || 0), 0) || 0;
  const remainingMT = order.remainingMT !== undefined ? order.remainingMT : Math.max(0, requestedMT - batchedMT);
  const totalMT = batchedMT; // Total batched quantity
  
  // Amount calculations
  const fullPOAmount = order.fullPOAmount || order.batches?.reduce((sum, b) => sum + (b.invoice?.totalAmount || 0), 0) || 0; // Full PO amount to be paid
  const invoicedAmount = order.invoicedAmount || order.totalAmount || order.batches?.reduce((sum, b) => sum + (b.invoice?.totalAmount || 0), 0) || 0; // Amount raised/invoiced
  const paidAmount = order.paidAmount || 0;
  const pendingAmount = order.pendingAmount || (invoicedAmount - paidAmount);
  
  // Progress calculations
  const invoiceProgressPercentage = fullPOAmount > 0 ? (invoicedAmount / fullPOAmount) * 100 : 0; // How much has been invoiced vs full PO
  const paymentProgressPercentage = invoicedAmount > 0 ? (paidAmount / invoicedAmount) * 100 : 0; // How much has been paid vs invoiced
  const batchingProgress = requestedMT > 0 ? (batchedMT / requestedMT) * 100 : 0;

  // Determine status color based on order status and payment status
  const getStatusColor = () => {
    // Red for rejected - highest priority
    if (order.status === "REJECTED") {
      return "from-red-500 to-rose-600";
    }
    // Yellow for pending payments (when there's pending payment amount and order is not rejected)
    if (pendingAmount > 0 && order.status !== "REJECTED") {
      return "from-yellow-500 to-amber-600";
    }
    // Green for processing (IN_PROGRESS, ACCEPTED, COMPLETED)
    if (order.status === "IN_PROGRESS" || order.status === "ACCEPTED" || order.status === "COMPLETED") {
      return "from-green-500 to-emerald-600";
    }
    // Default colors for other statuses
    const defaultColors = {
      CREATED: "from-gray-500 to-gray-600",
      PENDING_APPROVAL: "from-yellow-500 to-amber-600",
    };
    return defaultColors[order.status] || "from-gray-500 to-gray-600";
  };

  // Get status display text
  const getStatusText = () => {
    if (order.status === "REJECTED") {
      return "REJECTED";
    }
    if (pendingAmount > 0 && order.status !== "REJECTED") {
      return "PENDING PAYMENT";
    }
    return order.status.replace(/_/g, " ");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-5 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                #{order.id.slice(0, 6).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Order Details</h3>
                <div className="space-y-1">
                  {order.requestedProduct && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Pellet Type:</span>{" "}
                      <span className="font-medium text-gray-900">{order.requestedProduct.type}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Placed:</span>{" "}
                    {formatIST(order.createdAt)}
                  </p>
                  {order.deliveryLocation && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Delivery Location:</span>{" "}
                      <span className="font-medium text-gray-900">{order.deliveryLocation}</span>
                    </p>
                  )}
                  {order.status === "COMPLETED" && order.batches && order.batches.length > 0 && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Expected Delivery:</span>{" "}
                      <span className="font-medium text-gray-900">
                        {(() => {
                          const deliveryDates = order.batches
                            .filter(b => b.deliveryAt)
                            .map(b => new Date(b.deliveryAt))
                            .sort((a, b) => b - a); // Latest first
                          if (deliveryDates.length > 0) {
                            return formatISTDate(deliveryDates[0]);
                          }
                          return "Not specified";
                        })()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r ${getStatusColor()} text-white shadow-sm`}>
              <div className="w-2 h-2 rounded-full bg-white/30"></div>
              {getStatusText()}
            </div>
          </div>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="px-6 py-5 space-y-4">
        {/* Rejection reason - always show if rejected - PROMINENT */}
        {order.status === "REJECTED" && (
          <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-700 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <div className="text-base font-bold text-red-900 mb-2">⚠️ Order Rejected</div>
                <div className="text-sm font-medium text-red-800 bg-red-50 rounded-lg p-3 border border-red-200">
                  <span className="font-semibold">Reason:</span> {order.rejectionReason || "No reason provided"}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Notes - always show if present */}
        {order.notes && (
          <div className={`rounded-xl p-4 ${order.status === "REJECTED" ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
            <div className="text-xs font-semibold text-gray-700 mb-1">Order Notes</div>
            <div className={`text-sm ${order.status === "REJECTED" ? "text-red-900" : "text-gray-700"}`}>{order.notes}</div>
          </div>
        )}
        
        {/* Show message if no notes and order is pending approval */}
        {!order.notes && order.status === "PENDING_APPROVAL" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-yellow-800 mb-1">Note</div>
            <div className="text-sm text-yellow-900">No notes provided for this order</div>
          </div>
        )}

        {/* Only show quantity, amount, and payment info if order is NOT rejected */}
        {order.status !== "REJECTED" && (
          <>
            {/* Order Quantity Progress */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Order Quantity</span>
                <span className="text-lg font-bold text-blue-700">
                  {requestedMT.toFixed(2)} MT
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Batched</span>
                  <span className="font-semibold text-gray-900">{batchedMT.toFixed(2)} MT</span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(batchingProgress, 100)}%` }}
                  ></div>
                </div>
                {remainingMT > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600 font-medium">Remaining</span>
                    <span className="font-bold text-orange-600">{remainingMT.toFixed(2)} MT</span>
                  </div>
                )}
                {remainingMT === 0 && batchedMT > 0 && (
                  <div className="text-xs text-green-600 font-medium text-center">
                    ✓ All quantity batched
                  </div>
                )}
              </div>
            </div>

            {/* Total Amount to be Paid (Full PO Amount) */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Total Amount to be Paid</span>
                <span className="text-2xl font-bold text-indigo-700">
                  ₹{fullPOAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Invoice Progress (Amount Raised/Invoiced) */}
            {fullPOAmount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Raised/Invoiced</span>
                  <span className="font-semibold text-gray-900">{invoiceProgressPercentage.toFixed(1)}%</span>
                </div>
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(invoiceProgressPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Invoiced: ₹{invoicedAmount.toLocaleString("en-IN")}</span>
                  <span>Remaining: ₹{(fullPOAmount - invoicedAmount).toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}

            {/* Payment Progress (Amount Paid vs Invoiced) */}
            {invoicedAmount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Progress</span>
                  <span className="font-semibold text-gray-900">{paymentProgressPercentage.toFixed(1)}%</span>
                </div>
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(paymentProgressPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Paid: ₹{paidAmount.toLocaleString("en-IN")}</span>
                  <span>Pending: ₹{pendingAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Batch Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{order.batches?.length || 0}</span> batches
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-white hover:text-gray-100 flex items-center gap-1 transition bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded-lg"
          >
            {expanded ? "Hide" : "View"} Details
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Batches */}
      {expanded && order.batches && order.batches.length > 0 && (
        <div className="px-6 pb-6 space-y-3 border-t border-gray-100 bg-gray-50/50">
          {order.batches.map((batch, idx) => (
            <BatchCard key={batch.id} batch={batch} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
import PayInvoiceForm from "./PayInvoiceForm";
import { showToast } from "./Toast";

export default function BatchCard({ batch, index = 0 }) {
  const invoice = batch.invoice;
  const siteName = batch.site?.name || batch.site || "Unknown";
  const productName = batch.product?.name || "Unknown Product";
  const invoiceTotal = invoice?.totalAmount ?? invoice?.total ?? null;
  const batchAmount = invoiceTotal ?? (batch.quantityMT * (batch.product?.pricePMT || 0) * 1.05); // Approximate if no invoice

  const statusConfig = {
    CREATED: { color: "from-gray-400 to-gray-500", label: "Created", icon: "○" },
    INVOICED: { color: "from-indigo-400 to-indigo-500", label: "Invoiced", icon: "📄" },
    PAYMENT_APPROVED: { color: "from-yellow-400 to-amber-500", label: "Payment Approved", icon: "✓" },
    IN_PROGRESS: { color: "from-blue-400 to-blue-500", label: "In Progress", icon: "⚙" },
    COMPLETED: { color: "from-green-400 to-emerald-500", label: "Completed", icon: "✓" },
    PAID: { color: "from-green-400 to-emerald-500", label: "Paid", icon: "✓" },
  };

  const status = statusConfig[batch.status] || statusConfig.CREATED;
  const paidAmount = invoice?.payments?.filter(p => p.verified).reduce((sum, p) => sum + p.amount, 0) || 0;
  const isFullyPaid = invoice && paidAmount >= (invoiceTotal || 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${status.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
              {index + 1}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{productName}</h4>
              <p className="text-xs text-gray-500">{siteName}</p>
            </div>
          </div>

          {/* Quantity and Amount */}
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm">
              <span className="text-gray-500">Quantity:</span>{" "}
              <span className="font-semibold text-gray-900">{batch.quantityMT.toFixed(2)} MT</span>
            </div>
            {invoice && (
              <div className="text-sm">
                <span className="text-gray-500">Amount:</span>{" "}
                <span className="font-semibold text-indigo-600">
                  ₹{Number(invoiceTotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Delivery Date */}
          {batch.deliveryAt && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Delivery: {new Date(batch.deliveryAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r ${status.color} text-white shadow-sm`}>
          <span>{status.icon}</span>
          {status.label}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-xs">
          <div className={`flex-1 h-1 rounded-full ${
            batch.status !== "CREATED" && batch.status !== "INVOICED" ? "bg-green-500" : "bg-gray-300"
          }`}></div>
          <div className={`flex-1 h-1 rounded-full ${
            batch.status === "PAYMENT_APPROVED" || batch.status === "IN_PROGRESS" || batch.status === "COMPLETED" || batch.status === "PAID"
              ? "bg-green-500" : "bg-gray-300"
          }`}></div>
          <div className={`flex-1 h-1 rounded-full ${
            batch.status === "IN_PROGRESS" || batch.status === "COMPLETED" || batch.status === "PAID"
              ? "bg-green-500" : "bg-gray-300"
          }`}></div>
          <div className={`flex-1 h-1 rounded-full ${
            batch.status === "COMPLETED" || batch.status === "PAID" ? "bg-green-500" : "bg-gray-300"
          }`}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Invoiced</span>
          <span>Paid</span>
          <span>Processing</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Invoice Details */}
      {invoice ? (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">Invoice #{invoice.number}</span>
            <span className="text-sm font-bold text-gray-900">
              ₹{Number(invoiceTotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Subtotal: ₹{invoice.subtotal.toLocaleString("en-IN")} · GST {invoice.gstRate}%: ₹{invoice.gstAmount.toLocaleString("en-IN")}
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-[#0b69a3] hover:underline"
            >
              Download invoice (PDF)
            </a>
            <a
              href={`/invoice/${invoice.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              View
            </a>
          </div>

          {/* Payment Status */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-gray-700">Payments:</div>
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                  <span className="text-gray-600">
                    ₹{p.amount.toLocaleString("en-IN")} via {p.mode || "N/A"}
                  </span>
                  {p.verified ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="text-yellow-600 font-medium">Pending</span>
                  )}
                </div>
              ))}
              {!isFullyPaid && (
                <div className="text-xs text-amber-600 font-medium mt-1">
                  Remaining: ₹{(Number(invoiceTotal || 0) - paidAmount).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          )}

          {/* Payment Form */}
          {(!invoice.payments || invoice.payments.length === 0 || !isFullyPaid) && (
            <div className="pt-2">
              <PayInvoiceForm invoiceId={invoice.id} />
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-100 pt-3 text-xs text-gray-400 text-center">
          Invoice pending generation
        </div>
      )}
    </div>
  );
}

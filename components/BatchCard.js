import PayInvoiceForm from "./PayInvoiceForm";
import { showToast } from "./Toast";
import { formatISTDate } from "../lib/dateUtils";
import { getPrimaryInvoice, getBatchTotalAmount, getBatchPaidAmount } from "../lib/invoiceHelpers";

function calculateDueDate(invoice) {
  if (!invoice) return null;
  if (invoice.dueDateOverride) return new Date(invoice.dueDateOverride);
  if (!invoice.createdAt) return null;
  const paymentTermDays = { NET_15: 15, NET_30: 30, NET_60: 60, NET_90: 90 };
  const invoiceDate = new Date(invoice.createdAt);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + (paymentTermDays[invoice.paymentTerm] || 30));
  return dueDate;
}

function getDueDateStatus(dueDate) {
  if (!dueDate) return { isOverdue: false, daysUntilDue: null };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);
  
  const isOverdue = dueDateOnly < today;
  const daysUntilDue = Math.ceil((dueDateOnly - today) / (1000 * 60 * 60 * 24));
  
  return { isOverdue, daysUntilDue };
}

export default function BatchCard({ batch, index = 0 }) {
  const invoice = getPrimaryInvoice(batch);
  const invoices = batch.invoices || [];
  const siteName = batch.site?.name || batch.site || "Unknown";
  const productName = batch.product?.name || "Unknown Product";
  const invoiceTotal = getBatchTotalAmount(batch) || invoice?.totalAmount || invoice?.total || null;
  const batchAmount = invoiceTotal ?? (batch.quantityMT * (batch.product?.pricePMT || 0) * 1.05);

  const statusConfig = {
    CREATED: { color: "from-gray-400 to-gray-500", label: "Created", icon: "○" },
    INVOICED: { color: "from-indigo-400 to-indigo-500", label: "Invoiced", icon: "📄" },
    PAYMENT_APPROVED: { color: "from-yellow-400 to-amber-500", label: "Paid – Awaiting Dispatch", icon: "✓" },
    IN_PROGRESS: { color: "from-blue-400 to-blue-500", label: "Dispatched – Awaiting Delivery", icon: "⚙" },
    COMPLETED: { color: "from-green-400 to-emerald-500", label: "Delivered", icon: "✓" },
    PAID: { color: "from-green-400 to-emerald-500", label: "Paid", icon: "✓" },
  };

  const status = statusConfig[batch.status] || statusConfig.CREATED;
  const paidAmount = getBatchPaidAmount(batch);
  const isFullyPaid = invoices.length > 0 && paidAmount >= (invoiceTotal || 0);

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

          {/* Quantity, Amount, Margin placeholder */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="text-sm">
              <span className="text-gray-500">Quantity:</span>{" "}
              <span className="font-semibold text-gray-900">{batch.quantityMT.toFixed(2)} MT</span>
            </div>
            {invoice && (
              <>
                <div className="text-sm">
                  <span className="text-gray-500">Order value (ex GST):</span>{" "}
                  <span className="font-semibold text-gray-900">
                    ₹{Number(invoice.subtotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Invoice total (incl. GST):</span>{" "}
                  <span className="font-semibold text-indigo-600">
                    ₹{Number(invoiceTotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </>
            )}
            {batch.batchMargin != null && (
              <div className="text-sm">
                <span className="text-gray-500">Margin:</span>{" "}
                <span className="font-semibold text-gray-700">₹{Number(batch.batchMargin).toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          {/* Delivery Date */}
          {batch.deliveryAt && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Delivery: {formatISTDate(batch.deliveryAt)}
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
      {invoices.length > 0 ? (
        <div className="border-t border-gray-100 pt-3 space-y-4">
          {invoices.map((inv) => {
            const invPaid = (inv.payments || []).filter((p) => p.verified).reduce((s, p) => s + p.amount, 0);
            const invTotal = Number(inv.totalAmount) || 0;
            const invFullyPaid = invPaid >= invTotal;
            const typeLabel = inv.invoiceType === "ADVANCE" ? "Advance" : inv.invoiceType === "BALANCE" ? "Balance" : "";
            return (
              <div key={inv.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">
                    Invoice #{inv.number}
                    {typeLabel && <span className="ml-1 text-indigo-600">({typeLabel})</span>}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹{invTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    <span className="text-xs font-normal text-gray-500 ml-1">(incl. GST)</span>
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    Order value (ex GST): ₹{(inv.subtotal || 0).toLocaleString("en-IN")} · GST {inv.gstRate}%: ₹{(inv.gstAmount || 0).toLocaleString("en-IN")}
                  </div>
                  {(() => {
                    const dueDate = calculateDueDate(inv);
                    const { isOverdue, daysUntilDue } = getDueDateStatus(dueDate);
                    if (!dueDate) return null;
                    return (
                      <div className={`font-medium ${isOverdue ? "text-red-600" : daysUntilDue <= 7 ? "text-yellow-600" : "text-gray-600"}`}>
                        Payment Terms: {inv.paymentTerm?.replace("NET_", "Net ") || "Net 30"} · Due: {formatISTDate(dueDate)}
                        {isOverdue && ` (Overdue by ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "day" : "days"})`}
                        {!isOverdue && daysUntilDue <= 7 && ` (${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"} remaining)`}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#0b69a3] hover:underline">
                    Download PDF
                  </a>
                  <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-gray-700">
                    View
                  </a>
                </div>
                {(inv.payments || []).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">Paid:</span>
                      <span className="font-bold text-green-600">₹{invPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                    {!invFullyPaid && (
                      <div className="text-xs text-amber-600 font-medium">Remaining: ₹{(invTotal - invPaid).toLocaleString("en-IN")}</div>
                    )}
                  </div>
                )}
                {!invFullyPaid && (
                  <div className="pt-1">
                    <PayInvoiceForm invoiceId={inv.id} invoice={inv} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-t border-gray-100 pt-3 text-xs text-gray-400 text-center">
          Invoice pending generation
        </div>
      )}
    </div>
  );
}

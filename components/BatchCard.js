import PayInvoiceForm from "./PayInvoiceForm";

export default function BatchCard({ batch }) {
  const invoice = batch.invoice;
  const siteName = batch.site?.name || batch.site || "Unknown";

  return (
    <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <div>
          <div className="font-medium">{batch.product?.name || "Unknown Product"}</div>
          <div className="text-sm text-gray-500">
            {batch.quantityMT} MT · {siteName}
          </div>
          <div className="text-xs text-gray-400">
            Delivery: {batch.deliveryAt || "Not scheduled"}
          </div>
        </div>

        <div className="text-sm font-medium">
          {batch.status}
        </div>
      </div>

      {invoice ? (
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Invoice #{invoice.number}</span>
            <span>₹{invoice.totalAmount?.toLocaleString() || invoice.total?.toLocaleString()}</span>
          </div>

          <div className="text-xs text-gray-500">
            GST {invoice.gstRate}% · ₹{invoice.gstAmount?.toLocaleString()}
          </div>

          <div className="text-xs text-gray-500">
            Status: {invoice.status}
          </div>

          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-medium">Payments:</div>
              {invoice.payments.map((p) => (
                <div key={p.id} className="text-xs text-gray-600">
                  ₹{p.amount} via {p.mode} - {p.verified ? "✓ Verified" : "Pending"}
                </div>
              ))}
            </div>
          )}

          {(!invoice.payments || invoice.payments.length === 0 || 
            invoice.payments.some(p => !p.verified)) && (
            <PayInvoiceForm invoiceId={invoice.id} />
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          Invoice not generated yet
        </div>
      )}
    </div>
  );
}
  
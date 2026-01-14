import { useState } from "react";

export default function InvoiceBlock({ invoice, payments = [], user }) {
  const [verifying, setVerifying] = useState(false);

  const pendingPayments = payments.filter(p => !p.verified);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
      <div className="flex justify-between">
        <div>
          <div className="text-sm text-gray-500">Invoice</div>
          <div className="font-semibold">{invoice.number}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Status</div>
          <div className="font-medium">{invoice.status}</div>
        </div>
      </div>

      <div className="text-sm text-gray-700 space-y-1">
        <div>Subtotal: ₹{invoice.subtotal}</div>
        <div>GST: ₹{invoice.gstAmount}</div>
        <div className="font-semibold">
          Total: ₹{invoice.totalAmount}
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div className="mt-3 border-t pt-3 space-y-2">
          <div className="text-sm font-medium">Payments</div>

          {pendingPayments.map(payment => (
            <div
              key={payment.id}
              className="flex justify-between items-center text-sm"
            >
              <div>
                ₹{payment.amount} via {payment.mode}
              </div>

              {!payment.verified &&
                (user.role === "FINANCE" || user.role === "ADMIN") && (
                  <button
                    disabled={verifying}
                    onClick={async () => {
                      setVerifying(true);
                      await fetch(
                        `/api/payments/${payment.id}/verify`,
                        { method: "POST" }
                      );
                      setVerifying(false);
                      window.location.reload();
                    }}
                    className="px-3 py-1 text-xs rounded bg-green-600 text-white"
                  >
                    Verify
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

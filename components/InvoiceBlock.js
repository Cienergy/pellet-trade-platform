import PayInvoiceForm from "./PayInvoiceForm";

export default function InvoiceBlock({ invoice }) {
  if (!invoice) return null;

  return (
    <div
      style={{
        marginTop: 8,
        paddingLeft: 16,
        borderLeft: "3px solid #999",
      }}
    >
      <div><strong>Invoice:</strong> {invoice.number}</div>
      <div>Amount: ₹{invoice.amount}</div>
      <div>Status: {invoice.status}</div>

      <div style={{ marginTop: 6 }}>
        <strong>Payments</strong>
        {invoice.payments.length === 0 && <div>No payments yet</div>}

        {invoice.payments.map(p => (
          <div key={p.id}>
            ₹{p.amount} via {p.mode} {p.verified ? "✅" : "⏳"}
          </div>
        ))}
      </div>

      <PayInvoiceForm invoiceId={invoice.id} />
    </div>
  );
}

{!p.verified && (user.role === "finance" || user.role === "admin") && (
    <button
      onClick={() =>
        fetch(`/api/payments/${p.id}/verify`, {
          method: "POST",
          headers: { "x-user-role": user.role },
        })
      }
    >
      Verify
    </button>
  )}
  
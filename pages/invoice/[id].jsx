import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function InvoiceView() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(setInvoice);
  }, [id]);

  if (!invoice) {
    return <div style={{ padding: 40 }}>Loading invoice…</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto" }}>
      <h2>Invoice #{invoice.number}</h2>

      <div style={{ marginTop: 24 }}>
        <Row label="Subtotal" value={`₹${invoice.subtotal.toFixed(2)}`} />
        <Row
          label={`GST (${invoice.gstType} @ ${invoice.gstRate}%)`}
          value={`₹${invoice.gstAmount.toFixed(2)}`}
        />
        <hr />
        <Row
          label="Total Amount"
          value={`₹${invoice.totalAmount.toFixed(2)}`}
          bold
        />
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 12,
        fontWeight: bold ? 600 : 400
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

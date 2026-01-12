import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function FinanceInvoices() {
  const [orders, setOrders] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/orders")
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setOrders)
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!orders) return <div>Loading invoices...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Finance — Invoices</h1>
      <pre>{JSON.stringify(orders, null, 2)}</pre>
    </div>
  );
}

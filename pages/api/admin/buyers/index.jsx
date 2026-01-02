import { useEffect, useState } from "react";
import Link from "next/link";

export default function BuyerList() {
  const [buyers, setBuyers] = useState([]);

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then(r => r.json())
      .then(setBuyers);
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Buyers</h2>

      <Link href="/admin/buyers/new">
        <button style={{ margin: "20px 0" }}>+ Add Buyer</button>
      </Link>

      <table width="100%" cellPadding="12" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">GST</th>
            <th align="left">State</th>
          </tr>
        </thead>
        <tbody>
          {buyers.map(b => (
            <tr key={b.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{b.name}</td>
              <td>{b.gst || "—"}</td>
              <td>{b.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

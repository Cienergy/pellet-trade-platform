import { useEffect, useState } from "react";

export default function AdminBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [name, setName] = useState("");
  const [gst, setGst] = useState("");
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ buyerMargin: "", defaultPaymentTerm: "", creditLimit: "" });

  async function loadBuyers() {
    const res = await fetch("/api/admin/buyers", {
      credentials: "include",
    });
    if (res.ok) {
      setBuyers(await res.json());
    }
  }

  useEffect(() => {
    loadBuyers();
  }, []);

  async function createBuyer() {
    setMsg("Creating...");
    const res = await fetch("/api/admin/buyers/create", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, gst, state }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Error");
    } else {
      setMsg("Buyer created");
      setName("");
      setGst("");
      setState("");
      loadBuyers();
    }
  }

  function startEdit(b) {
    setEditingId(b.id);
    setEditForm({
      buyerMargin: b.buyerMargin != null ? String(b.buyerMargin) : "",
      defaultPaymentTerm: b.defaultPaymentTerm || "",
      creditLimit: b.creditLimit != null ? String(b.creditLimit) : "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await fetch(`/api/admin/organizations/${editingId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerMargin: editForm.buyerMargin === "" ? null : parseFloat(editForm.buyerMargin),
        defaultPaymentTerm: editForm.defaultPaymentTerm || null,
        creditLimit: editForm.creditLimit === "" ? null : parseFloat(editForm.creditLimit),
      }),
    });
    if (res.ok) {
      setEditingId(null);
      loadBuyers();
    }
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Buyers</h1>

      {/* Create Buyer */}
      <div className="grid grid-cols-3 gap-3">
        <input
          className="border p-2 rounded"
          placeholder="Buyer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="GST (optional)"
          value={gst}
          onChange={(e) => setGst(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="State (e.g. KA)"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />

        <button
          onClick={createBuyer}
          className="col-span-3 bg-black text-white py-2 rounded"
        >
          Create Buyer
        </button>

        {msg && <div className="col-span-3 text-sm">{msg}</div>}
      </div>

      {/* Buyers Table with margin / payment term placeholders */}
      <table className="w-full border rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">GST</th>
            <th className="p-2 border">State</th>
            <th className="p-2 border">Buyer Margin</th>
            <th className="p-2 border">Default Payment</th>
            <th className="p-2 border">Credit Limit</th>
            <th className="p-2 border">Created</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {buyers.map((b) => (
            <tr key={b.id}>
              <td className="p-2 border">{b.name}</td>
              <td className="p-2 border">{b.gst || "-"}</td>
              <td className="p-2 border">{b.state}</td>
              {editingId === b.id ? (
                <>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.01"
                      className="border p-1 w-24 rounded"
                      placeholder="Margin"
                      value={editForm.buyerMargin}
                      onChange={(e) => setEditForm((f) => ({ ...f, buyerMargin: e.target.value }))}
                    />
                  </td>
                  <td className="p-2 border">
                    <select
                      className="border p-1 rounded"
                      value={editForm.defaultPaymentTerm}
                      onChange={(e) => setEditForm((f) => ({ ...f, defaultPaymentTerm: e.target.value }))}
                    >
                      <option value="">—</option>
                      <option value="NET_30">Net 30</option>
                      <option value="NET_60">Net 60</option>
                      <option value="NET_90">Net 90</option>
                    </select>
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      step="0.01"
                      className="border p-1 w-24 rounded"
                      placeholder="Limit"
                      value={editForm.creditLimit}
                      onChange={(e) => setEditForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    />
                  </td>
                  <td className="p-2 border">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="p-2 border">
                    <button onClick={saveEdit} className="text-blue-600 text-sm mr-1">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 text-sm">Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2 border">{b.buyerMargin != null ? `₹${Number(b.buyerMargin).toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-2 border">{b.defaultPaymentTerm ? b.defaultPaymentTerm.replace("NET_", "Net ") : "—"}</td>
                  <td className="p-2 border">{b.creditLimit != null ? `₹${Number(b.creditLimit).toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-2 border">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="p-2 border">
                    <button onClick={() => startEdit(b)} className="text-blue-600 text-sm">Edit</button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {buyers.length === 0 && (
            <tr>
              <td colSpan="8" className="p-4 text-center text-gray-500">
                No buyers found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

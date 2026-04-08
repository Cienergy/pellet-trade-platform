import { useEffect, useState } from "react";

export default function AdminBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [name, setName] = useState("");
  const [gst, setGst] = useState("");
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    buyerMargin: "",
    defaultPaymentTerm: "",
    defaultPaymentMode: "",
    advancePercent: "",
    earlyPayDiscountPercent: "",
    earlyPayDiscountDays: "",
    retentionPercent: "",
    retentionDays: "",
    securityDepositAmount: "",
    creditLimit: "",
    blockNewOrdersIfOverdue: false,
  });
  const [depositMsg, setDepositMsg] = useState("");

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
      defaultPaymentMode: b.defaultPaymentMode || "",
      advancePercent: b.advancePercent != null ? String(b.advancePercent) : "",
      earlyPayDiscountPercent: b.earlyPayDiscountPercent != null ? String(b.earlyPayDiscountPercent) : "",
      earlyPayDiscountDays: b.earlyPayDiscountDays != null ? String(b.earlyPayDiscountDays) : "",
      retentionPercent: b.retentionPercent != null ? String(b.retentionPercent) : "",
      retentionDays: b.retentionDays != null ? String(b.retentionDays) : "",
      securityDepositAmount: b.securityDepositAmount != null ? String(b.securityDepositAmount) : "",
      creditLimit: b.creditLimit != null ? String(b.creditLimit) : "",
      blockNewOrdersIfOverdue: !!b.blockNewOrdersIfOverdue,
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
        defaultPaymentMode: editForm.defaultPaymentMode || null,
        advancePercent: editForm.advancePercent === "" ? null : parseFloat(editForm.advancePercent),
        earlyPayDiscountPercent: editForm.earlyPayDiscountPercent === "" ? null : parseFloat(editForm.earlyPayDiscountPercent),
        earlyPayDiscountDays: editForm.earlyPayDiscountDays === "" ? null : parseInt(editForm.earlyPayDiscountDays, 10),
        retentionPercent: editForm.retentionPercent === "" ? null : parseFloat(editForm.retentionPercent),
        retentionDays: editForm.retentionDays === "" ? null : parseInt(editForm.retentionDays, 10),
        securityDepositAmount: editForm.securityDepositAmount === "" ? null : parseFloat(editForm.securityDepositAmount),
        creditLimit: editForm.creditLimit === "" ? null : parseFloat(editForm.creditLimit),
        blockNewOrdersIfOverdue: editForm.blockNewOrdersIfOverdue,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      loadBuyers();
    }
  }

  async function createSecurityDeposit(orgId, amount) {
    setDepositMsg("Creating...");
    const res = await fetch(`/api/admin/organizations/${orgId}/security-deposit-invoice`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(amount != null ? { amount } : {}),
    });
    const data = await res.json();
    if (!res.ok) {
      setDepositMsg(data.error || "Error");
    } else {
      setDepositMsg(`Invoice ${data.number} created`);
      setTimeout(() => setDepositMsg(""), 3000);
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

      {depositMsg && <p className="text-sm text-amber-700">{depositMsg}</p>}

      <table className="w-full border rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">GST</th>
            <th className="p-2 border">State</th>
            <th className="p-2 border">Margin</th>
            <th className="p-2 border">Term</th>
            <th className="p-2 border">Payment Mode</th>
            <th className="p-2 border">Adv / EPD / Ret</th>
            <th className="p-2 border">Deposit</th>
            <th className="p-2 border">Credit</th>
            <th className="p-2 border">Block</th>
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
                    <input type="number" step="0.01" className="border p-1 w-20 rounded" placeholder="Margin" value={editForm.buyerMargin} onChange={(e) => setEditForm((f) => ({ ...f, buyerMargin: e.target.value }))} />
                  </td>
                  <td className="p-2 border">
                    <select className="border p-1 rounded" value={editForm.defaultPaymentTerm} onChange={(e) => setEditForm((f) => ({ ...f, defaultPaymentTerm: e.target.value }))}>
                      <option value="">—</option>
                      <option value="NET_15">Net 15</option>
                      <option value="NET_30">Net 30</option>
                      <option value="NET_60">Net 60</option>
                      <option value="NET_90">Net 90</option>
                    </select>
                  </td>
                  <td className="p-2 border">
                    <select className="border p-1 rounded text-xs" value={editForm.defaultPaymentMode} onChange={(e) => setEditForm((f) => ({ ...f, defaultPaymentMode: e.target.value }))}>
                      <option value="">Net terms</option>
                      <option value="NET_TERMS">Net terms</option>
                      <option value="ADVANCE_BALANCE">Advance + Balance</option>
                      <option value="PAY_BEFORE_DISPATCH">Pay before dispatch</option>
                    </select>
                  </td>
                  <td className="p-2 border text-xs">
                    Adv%: <input type="number" min="0" max="100" step="1" className="border p-0.5 w-10 rounded" value={editForm.advancePercent} onChange={(e) => setEditForm((f) => ({ ...f, advancePercent: e.target.value }))} />
                    EPD%: <input type="number" min="0" max="100" step="0.5" className="border p-0.5 w-10 rounded" value={editForm.earlyPayDiscountPercent} onChange={(e) => setEditForm((f) => ({ ...f, earlyPayDiscountPercent: e.target.value }))} />
                    Days: <input type="number" min="0" className="border p-0.5 w-10 rounded" value={editForm.earlyPayDiscountDays} onChange={(e) => setEditForm((f) => ({ ...f, earlyPayDiscountDays: e.target.value }))} />
                    Ret%: <input type="number" min="0" max="100" step="1" className="border p-0.5 w-10 rounded" value={editForm.retentionPercent} onChange={(e) => setEditForm((f) => ({ ...f, retentionPercent: e.target.value }))} />
                    Days: <input type="number" min="0" className="border p-0.5 w-10 rounded" value={editForm.retentionDays} onChange={(e) => setEditForm((f) => ({ ...f, retentionDays: e.target.value }))} />
                  </td>
                  <td className="p-2 border">
                    <input type="number" step="0.01" min="0" className="border p-1 w-20 rounded" placeholder="Deposit" value={editForm.securityDepositAmount} onChange={(e) => setEditForm((f) => ({ ...f, securityDepositAmount: e.target.value }))} />
                  </td>
                  <td className="p-2 border">
                    <input type="number" step="0.01" className="border p-1 w-20 rounded" placeholder="Limit" value={editForm.creditLimit} onChange={(e) => setEditForm((f) => ({ ...f, creditLimit: e.target.value }))} />
                  </td>
                  <td className="p-2 border">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={editForm.blockNewOrdersIfOverdue} onChange={(e) => setEditForm((f) => ({ ...f, blockNewOrdersIfOverdue: e.target.checked }))} />Block</label>
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
                  <td className="p-2 border text-xs">{b.defaultPaymentMode === "ADVANCE_BALANCE" ? "Adv+Bal" : b.defaultPaymentMode === "PAY_BEFORE_DISPATCH" ? "PBD" : "—"}</td>
                  <td className="p-2 border text-xs">{[b.advancePercent != null && `${b.advancePercent}% adv`, b.earlyPayDiscountPercent != null && `${b.earlyPayDiscountPercent}/${b.earlyPayDiscountDays} EPD`, b.retentionPercent != null && `${b.retentionPercent}% ret`].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-2 border">
                    {b.securityDepositAmount != null ? `₹${Number(b.securityDepositAmount).toLocaleString("en-IN")}` : "—"}
                    {b.securityDepositAmount > 0 && (
                      <button type="button" onClick={() => createSecurityDeposit(b.id)} className="ml-1 text-xs text-blue-600 hover:underline">Create SD</button>
                    )}
                  </td>
                  <td className="p-2 border">{b.creditLimit != null ? `₹${Number(b.creditLimit).toLocaleString("en-IN")}` : "—"}</td>
                  <td className="p-2 border">{b.blockNewOrdersIfOverdue ? "Yes" : "No"}</td>
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
              <td colSpan={12} className="p-4 text-center text-gray-500">No buyers found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

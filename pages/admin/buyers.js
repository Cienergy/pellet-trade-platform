import { useEffect, useState } from "react";

export default function AdminBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [name, setName] = useState("");
  const [gst, setGst] = useState("");
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");

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

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Buyers</h1>

      {/* Create Buyer */}
      <div className="grid grid-cols-3 gap-3">
        <input
          className="border p-2"
          placeholder="Buyer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="GST (optional)"
          value={gst}
          onChange={(e) => setGst(e.target.value)}
        />
        <input
          className="border p-2"
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

      {/* Buyers Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">GST</th>
            <th className="p-2 border">State</th>
            <th className="p-2 border">Created</th>
          </tr>
        </thead>
        <tbody>
          {buyers.map((b) => (
            <tr key={b.id}>
              <td className="p-2 border">{b.name}</td>
              <td className="p-2 border">{b.gst || "-"}</td>
              <td className="p-2 border">{b.state}</td>
              <td className="p-2 border">
                {new Date(b.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {buyers.length === 0 && (
            <tr>
              <td colSpan="4" className="p-4 text-center text-gray-500">
                No buyers found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

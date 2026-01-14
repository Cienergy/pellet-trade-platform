import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function AdminSites() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    fetch("/api/admin/sites", { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setSites(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  async function createSite(e) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/admin/sites", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const newSite = await res.json();
      setSites([...sites, newSite]);
      setForm({ name: "", city: "", state: "" });
      alert("Site created successfully");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to create site");
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Manage Sites</h1>
            <p className="text-gray-600 mt-1">Configure factory sites</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Create Form */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Create Site</h2>
          <form onSubmit={createSite} className="grid grid-cols-3 gap-4">
            <input
              className="border p-2 rounded"
              placeholder="Site Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="border p-2 rounded"
              placeholder="City *"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
            <input
              className="border p-2 rounded"
              placeholder="State *"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="col-span-3 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition"
            >
              {submitting ? "Creating..." : "Create Site"}
            </button>
          </form>
        </div>

        {/* Sites List */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b font-semibold">Sites</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">City</th>
                  <th className="p-3 text-left">State</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.city}</td>
                    <td className="p-3">{s.state}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          s.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      No sites found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


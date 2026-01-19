import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { showToast } from "../../components/Toast";

export default function OpsInventory() {
  const router = useRouter();
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    productId: "",
    siteId: "",
    availableMT: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/ops/inventory", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/admin/products", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/admin/sites", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([inv, prods, sts]) => {
      // Ensure all values are arrays
      if (Array.isArray(inv)) setInventory(inv);
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(sts)) setSites(sts);
      setLoading(false);
    });
  }, []);

  async function updateInventory(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/ops/inventory", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const updated = await res.json();
        setInventory((inv) => {
          const index = inv.findIndex(
            (i) =>
              i.productId === updated.productId && i.siteId === updated.siteId
          );
          if (index >= 0) {
            inv[index] = updated;
            return [...inv];
          }
          return [...inv, updated];
        });
        setForm({ productId: "", siteId: "", availableMT: "" });
        showToast("Inventory updated successfully", "success");
      } else {
        const error = await res.json();
        showToast(error.error || "Failed to update inventory", "error");
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      showToast("Failed to update inventory", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Update Inventory</h1>
            <p className="text-gray-600 mt-1">
              Update inventory levels by product and site
            </p>
          </div>
          <Link
            href="/ops/dashboard"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Update Form */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Update Inventory</h2>
          <form onSubmit={updateInventory} className="grid grid-cols-4 gap-4">
            <select
              className="border p-2 rounded"
              value={form.productId}
              onChange={(e) =>
                setForm({ ...form, productId: e.target.value })
              }
              required
            >
              <option value="">Select Product</option>
              {Array.isArray(products) && products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="border p-2 rounded"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              required
            >
              <option value="">Select Site</option>
              {Array.isArray(sites) && sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              className="border p-2 rounded"
              placeholder="Available MT"
              value={form.availableMT}
              onChange={(e) =>
                setForm({ ...form, availableMT: e.target.value })
              }
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition"
            >
              {submitting ? "Updating..." : "Update"}
            </button>
          </form>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b font-semibold">Current Inventory</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Site</th>
                  <th className="p-3 text-right">Available (MT)</th>
                  <th className="p-3 text-left">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(inventory) && inventory.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="p-3">{inv.product?.name || "-"}</td>
                    <td className="p-3">{inv.site?.name || "-"}</td>
                    <td className="p-3 text-right font-semibold">
                      {inv.availableMT.toFixed(2)}
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {new Date(inv.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {(!Array.isArray(inventory) || inventory.length === 0) && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      No inventory records found
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
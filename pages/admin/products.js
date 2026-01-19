import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { showToast } from "../../components/Toast";

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    type: "",
    grade: "",
    cvMin: "",
    cvMax: "",
    ashPct: "",
    moisture: "",
    pricePMT: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    fetch("/api/admin/products", { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  async function createProduct(e) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/admin/products", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const newProduct = await res.json();
      setProducts([...products, newProduct]);
      setForm({
        sku: "",
        name: "",
        type: "",
        grade: "",
        cvMin: "",
        cvMax: "",
        ashPct: "",
        moisture: "",
        pricePMT: "",
      });
      showToast("Product created successfully", "success");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "Failed to create product", "error");
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div>Loading products...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold">Manage Products</h1>
            <p className="text-gray-600 mt-1">Add and update products</p>
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
          <h2 className="text-lg font-semibold mb-4">Create Product</h2>
          <form onSubmit={createProduct} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input
              className="border p-2 rounded"
              placeholder="SKU *"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
            <input
              className="border p-2 rounded"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="border p-2 rounded"
              placeholder="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <input
              className="border p-2 rounded"
              placeholder="Grade"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
            <input
              type="number"
              className="border p-2 rounded"
              placeholder="CV Min"
              value={form.cvMin}
              onChange={(e) => setForm({ ...form, cvMin: e.target.value })}
            />
            <input
              type="number"
              className="border p-2 rounded"
              placeholder="CV Max"
              value={form.cvMax}
              onChange={(e) => setForm({ ...form, cvMax: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded"
              placeholder="Ash %"
              value={form.ashPct}
              onChange={(e) => setForm({ ...form, ashPct: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded"
              placeholder="Moisture %"
              value={form.moisture}
              onChange={(e) => setForm({ ...form, moisture: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded"
              placeholder="Price per MT *"
              value={form.pricePMT}
              onChange={(e) => setForm({ ...form, pricePMT: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="col-span-2 md:col-span-4 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition"
            >
              {submitting ? "Creating..." : "Create Product"}
            </button>
          </form>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b font-semibold">Products</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Grade</th>
                  <th className="p-3 text-right">Price/MT</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.sku}</td>
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{p.type || "-"}</td>
                    <td className="p-3">{p.grade || "-"}</td>
                    <td className="p-3 text-right">₹{p.pricePMT}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          p.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No products found
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


import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../../components/BuyerLayout";
import Link from "next/link";

export default function CreateOrder() {
  const router = useRouter();
  const { productId } = router.query;
  const [products, setProducts] = useState([]);
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({
    productId: productId || "",
    siteId: "",
    quantityMT: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/buyer/catalog", { credentials: "include" }).then((r) =>
        r.json()
      ),
      fetch("/api/admin/sites", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([prods, sts]) => {
      if (prods) setProducts(prods);
      if (sts) setSites(sts);
    });
  }, []);

  async function submitOrder(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const order = await res.json();
      router.push(`/buyer/orders?created=${order.id}`);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to create order");
      setSubmitting(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === form.productId);

  return (
    <BuyerLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Create Order</h1>
          <Link
            href="/buyer/catalog"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            ← Back to Catalog
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
            {error}
          </div>
        )}

        <form onSubmit={submitOrder} className="bg-white rounded-xl border p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              className="w-full border p-2 rounded"
              value={form.productId}
              onChange={(e) =>
                setForm({ ...form, productId: e.target.value })
              }
              required
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - ₹{p.pricePMT}/MT
                  {p.availableMT > 0
                    ? ` (${p.availableMT} MT available)`
                    : " (Out of stock)"}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="mt-2 text-sm text-gray-600">
                Price: ₹{selectedProduct.pricePMT} per MT
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site
            </label>
            <select
              className="w-full border p-2 rounded"
              value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              required
            >
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.city}, {s.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (MT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full border p-2 rounded"
              value={form.quantityMT}
              onChange={(e) =>
                setForm({ ...form, quantityMT: e.target.value })
              }
              required
            />
            {selectedProduct && form.quantityMT && (
              <div className="mt-2 text-sm text-gray-600">
                Estimated Total: ₹
                {(
                  Number(form.quantityMT) * selectedProduct.pricePMT
                ).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Creating Order..." : "Create Order"}
            </button>
            <Link
              href="/buyer/catalog"
              className="px-6 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </BuyerLayout>
  );
}


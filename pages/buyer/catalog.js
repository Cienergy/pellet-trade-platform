import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../components/BuyerLayout";
import Link from "next/link";

export default function BuyerCatalog() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/buyer/catalog", {
          credentials: "same-origin",
        });

        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          throw new Error(`Catalog API failed with ${res.status}`);
        }

        const data = await res.json();

        console.log("data =", data);

        // 🔒 HARD ASSERTION — API MUST RETURN ARRAY
        if (!Array.isArray(data)) {
          console.error("Invalid catalog response:", data);
          throw new Error("Invalid catalog response");
        }

        setProducts(data);
      } catch (err) {
        console.error("Catalog load failed:", err);
        setError("Failed to load catalog");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  if (loading) {
    return (
      <BuyerLayout>
        <div className="p-6">Loading catalog…</div>
      </BuyerLayout>
    );
  }

  if (error) {
    return (
      <BuyerLayout>
        <div className="p-6 text-red-600">{error}</div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Product Catalog</h1>
        <p className="text-gray-600">
          Live availability and pricing synced with ERP
        </p>

        {products.length === 0 ? (
          <div className="text-gray-500">No products available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <h2 className="font-semibold text-lg">{p.name}</h2>

                  <div className="mt-3 text-sm">
                    <div>Price</div>
                    <div className="font-medium">₹{p.pricePMT} / MT</div>
                  </div>

                  <div className="mt-2 text-sm">
                    Availability{" "}
                    <span className="font-medium">{p.availableMT} MT</span>
                  </div>
                </div>

                {p.availableMT > 0 ? (
                  <Link
                    href={`/buyer/orders/create?productId=${p.id}`}
                    className="mt-4 inline-block text-blue-600 font-medium"
                  >
                    Create Order →
                  </Link>
                ) : (
                  <button
                    disabled
                    className="mt-4 text-gray-400 cursor-not-allowed"
                  >
                    Unavailable
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Availability reflects aggregated inventory across factory sites.
        </p>
      </div>
    </BuyerLayout>
  );
}

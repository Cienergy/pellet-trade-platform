import { useState } from "react";
import BuyerLayout from "../../components/BuyerLayout";
import { ERP } from "../../lib/erp";

const MOCK_PRODUCTS = [
  {
    id: "PROD-A",
    name: "Biomass Pellets – Grade A",
    pricePMT: 8200,
    available: true,
  },
  {
    id: "PROD-B",
    name: "Biomass Pellets – Grade B",
    pricePMT: 7600,
    available: true,
  },
  {
    id: "PROD-C",
    name: "Agro Residue Pellets",
    pricePMT: 6900,
    available: false,
  },
];

export default function CreateOrder() {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = MOCK_PRODUCTS.find(p => p.id === productId);

  function submitOrder() {
    if (!productId || !quantity) return;

    setSubmitting(true);

    const res = ERP.createBuyerOrder(
      {
        productId,
        quantityMT: Number(quantity),
      },
      { role: "BUYER", orgId: "org-1" }
    );

    setResult(res);
    setSubmitting(false);
  }

  return (
    <BuyerLayout title="Create Order">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Create New Order</h1>
          <p className="text-gray-500">
            Select a product and submit a quantity request
          </p>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Product
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select product</option>
              {MOCK_PRODUCTS.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  disabled={!p.available}
                >
                  {p.name} {!p.available ? "(Unavailable)" : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="text-sm text-gray-500">
              Indicative price: ₹{selectedProduct.pricePMT} / MT
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Quantity (MT)
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={submitOrder}
              disabled={submitting || !productId || !quantity}
              className="px-6 py-2 bg-black text-white rounded disabled:opacity-40"
            >
              {submitting ? "Submitting..." : "Submit Order Request"}
            </button>
          </div>

          {result && (
            <div className="border-t pt-4 text-sm">
              <div className="font-medium text-green-600">
                {result.message}
              </div>
              <div className="text-gray-500">
                Order ID: {result.orderId}
              </div>
            </div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}

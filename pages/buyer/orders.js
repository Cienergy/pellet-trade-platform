import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../components/BuyerLayout";
import OrderCard from "../../components/OrderCard";

export default function BuyerOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/buyer/orders", { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setOrders(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  return (
    <BuyerLayout title="My Orders">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">My Orders</h1>
          <p className="text-gray-500">
            Track orders, invoices, and payment status
          </p>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500">
            No orders placed yet.
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}

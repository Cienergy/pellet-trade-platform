import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BuyerLayout from "../../components/BuyerLayout";
import OrderCard from "../../components/OrderCard";

export default function BuyerOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredOrders = orders.filter((order) => {
    // Filter by status
    if (filter !== "all" && order.status !== filter) return false;
    
    // Search by order ID
    if (searchQuery && !order.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const stats = {
    total: orders.length,
    active: orders.filter((o) => o.status !== "COMPLETED").length,
    completed: orders.filter((o) => o.status === "COMPLETED").length,
    pending: orders.filter((o) => o.remainingMT > 0).length,
  };

  return (
    <BuyerLayout title="My Orders">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Orders</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Active Orders</div>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Pending Batching</div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {["all", "CREATED", "IN_PROGRESS", "COMPLETED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === status
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || filter !== "all" ? "No orders found" : "No orders placed yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filter !== "all"
                ? "Try adjusting your search or filters"
                : "Start by browsing our catalog and placing your first order"}
            </p>
            {!searchQuery && filter === "all" && (
              <a
                href="/buyer/catalog"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Browse Catalog
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}

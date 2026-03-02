import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ClockIcon, PackageIcon, ArrowRightIcon } from "../../components/Icons";
import { formatISTDate, formatIST } from "../../lib/dateUtils";

export default function OpsDispatchTimeline() {
  const router = useRouter();
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(""); // "" | orderId | batchId
  const [orderId, setOrderId] = useState("");
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    loadTimelines();
  }, [orderId, batchId, filter]);

  async function loadTimelines() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "orderId" && orderId) params.set("orderId", orderId);
      if (filter === "batchId" && batchId) params.set("batchId", batchId);
      const res = await fetch(`/api/ops/dispatch-timeline?${params.toString()}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setTimelines(Array.isArray(data) ? data : []);
    } catch (e) {
      setTimelines([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dispatch & Delivery Timelines</h1>
              <p className="text-gray-600 text-sm mt-1">Track batch events and delivery performance</p>
            </div>
            <Link
              href="/ops/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              ← Dashboard
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="filter"
                checked={filter === ""}
                onChange={() => { setFilter(""); setOrderId(""); setBatchId(""); }}
              />
              <span className="text-sm">All recent (100)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="filter"
                checked={filter === "orderId"}
                onChange={() => setFilter("orderId")}
              />
              <span className="text-sm">By Order ID</span>
            </label>
            {filter === "orderId" && (
              <input
                type="text"
                placeholder="Order ID"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="filter"
                checked={filter === "batchId"}
                onChange={() => setFilter("batchId")}
              />
              <span className="text-sm">By Batch ID</span>
            </label>
            {filter === "batchId" && (
              <input
                type="text"
                placeholder="Batch ID"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-[#0b69a3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : timelines.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No timeline data. Use filters or ensure batches exist.
          </div>
        ) : (
          <div className="space-y-6">
            {timelines.map((t) => (
              <div key={t.batchId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <PackageIcon className="w-5 h-5 text-[#0b69a3]" />
                    <span className="font-mono text-sm text-gray-600">Batch {t.batchId?.slice(0, 8)}…</span>
                    <span className="text-sm text-gray-500">Order {t.orderId?.slice(0, 8)}…</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {t.productName} · {t.quantityMT} MT · {t.buyerName}
                  </div>
                </div>
                <div className="p-4 flex flex-wrap gap-6">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Timeline events</div>
                    <div className="space-y-1">
                      {t.events?.length ? t.events.map((ev, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{ev.label}</span>
                          <span className="text-gray-500">{formatIST(ev.timestamp)}</span>
                          {ev.imageUrl && (
                            <a href={ev.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[#0b69a3] text-xs">View image</a>
                          )}
                        </div>
                      )) : (
                        <span className="text-gray-400 text-sm">No events yet</span>
                      )}
                    </div>
                  </div>
                  <div className="border-l border-gray-200 pl-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery performance</div>
                    <div className="space-y-1 text-sm">
                      {t.performance?.daysToDelivery != null && (
                        <div>Days to delivery: <strong>{t.performance.daysToDelivery}</strong></div>
                      )}
                      {t.performance?.transitDays != null && (
                        <div>Transit days: <strong>{t.performance.transitDays}</strong></div>
                      )}
                      {t.performance?.onTime != null && (
                        <div>On time: <strong>{t.performance.onTime ? "Yes" : "No"}</strong></div>
                      )}
                      {!t.performance?.daysToDelivery && !t.performance?.transitDays && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

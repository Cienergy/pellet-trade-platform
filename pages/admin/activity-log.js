import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function AdminActivityLog() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [requestId, setRequestId] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    if (requestId) params.set("requestId", requestId);
    params.set("limit", "100");
    fetch(`/api/admin/activity-log?${params}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        return res.json();
      })
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [entity, action, requestId, router]);

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
              <p className="text-gray-600 text-sm mt-1">User and system actions</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                ← Dashboard
              </Link>
              <Link
                href="/finance/reports"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Reports
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <input
              type="text"
              placeholder="Filter by entity (order, invoice, payment...)"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
            />
            <input
              type="text"
              placeholder="Filter by action"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <input
              type="text"
              placeholder="Filter by requestId"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 font-mono"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-[#0b69a3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3 border-b">Time</th>
                    <th className="p-3 border-b">Entity</th>
                    <th className="p-3 border-b">Action</th>
                    <th className="p-3 border-b">Entity ID</th>
                    <th className="p-3 border-b">User</th>
                    <th className="p-3 border-b">Request</th>
                    <th className="p-3 border-b">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(logs) ? logs : []).map((log) => (
                    <>
                      <tr key={log.id} className="border-b border-gray-100 align-top">
                        <td className="p-3 text-gray-600 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 font-medium">{log.entity}</td>
                        <td className="p-3">{log.action}</td>
                        <td className="p-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {log.entityId ? `${log.entityId.slice(0, 8)}…` : "—"}
                        </td>
                        <td className="p-3">
                          {log.actor?.name || log.actor?.email || (log.actorId ? "—" : "System")}
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {log.requestId ? `${log.requestId.slice(0, 12)}…` : "—"}
                        </td>
                        <td className="p-3">
                          {(log.metadata || log.ip || log.userAgent) ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(log.id)}
                              className="text-[#0b69a3] hover:underline text-xs"
                            >
                              {expanded.has(log.id) ? "Hide" : "View"}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                      {expanded.has(log.id) && (
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td className="p-3" colSpan={7}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="text-xs font-semibold text-gray-700 mb-1">Request</div>
                                <div className="text-xs text-gray-600 font-mono break-all">
                                  {log.requestId || "—"}
                                </div>
                                <div className="text-xs text-gray-600 mt-2">
                                  <span className="font-semibold">IP:</span> {log.ip || "—"}
                                </div>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-3 md:col-span-2">
                                <div className="text-xs font-semibold text-gray-700 mb-1">Metadata</div>
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
                                  {log.metadata ? JSON.stringify(log.metadata, null, 2) : "—"}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            {(!logs || logs.length === 0) && (
              <div className="p-12 text-center text-gray-500">No activity found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

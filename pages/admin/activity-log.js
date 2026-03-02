import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function AdminActivityLog() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
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
  }, [entity, action, router]);

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
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(logs) ? logs : []).map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="p-3 text-gray-600">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 font-medium">{log.entity}</td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3 font-mono text-xs text-gray-500">{log.entityId?.slice(0, 8)}…</td>
                      <td className="p-3">
                        {log.actor?.name || log.actor?.email || (log.actorId ? "—" : "System")}
                      </td>
                    </tr>
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

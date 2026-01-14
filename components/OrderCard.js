import BatchCard from "./BatchCard";

export default function OrderCard({ order }) {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div className="flex justify-between">
        <div>
          <div className="text-sm text-gray-500">
            Order ID
          </div>
          <div className="font-semibold">
            {order.id}
          </div>
          <div className="text-xs text-gray-400">
            Created on {order.createdAt}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">Status</div>
          <div className="font-medium">{order.status}</div>
          <div className="text-sm text-gray-500 mt-1">
            Total {order.totalMT} MT
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {order.batches.map((batch) => (
          <BatchCard key={batch.id} batch={batch} />
        ))}
      </div>
    </div>
  );
}

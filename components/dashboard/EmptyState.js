export default function EmptyState({ title = "No data", subtitle, action }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-2xl bg-white p-10 text-center">
      <div className="text-slate-900 font-semibold">{title}</div>
      {subtitle ? <div className="text-slate-500 text-sm mt-1">{subtitle}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}


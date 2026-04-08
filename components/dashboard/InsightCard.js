export default function InsightCard({ title, subtitle, icon, children, right }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          {icon ? (
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-900 truncate">{title}</div>
            {subtitle ? <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div> : null}
          </div>
        </div>
        {right ? <div className="flex-shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}


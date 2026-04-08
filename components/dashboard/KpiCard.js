export default function KpiCard({
  label,
  value,
  sublabel,
  icon,
  tone = "slate",
  highlight = false,
}) {
  const tones = {
    slate: { iconBg: "bg-slate-100", iconText: "text-slate-700", value: "text-slate-900" },
    blue: { iconBg: "bg-blue-100", iconText: "text-blue-700", value: "text-blue-700" },
    green: { iconBg: "bg-emerald-100", iconText: "text-emerald-700", value: "text-emerald-700" },
    amber: { iconBg: "bg-amber-100", iconText: "text-amber-700", value: "text-amber-700" },
    red: { iconBg: "bg-red-100", iconText: "text-red-700", value: "text-red-700" },
    purple: { iconBg: "bg-purple-100", iconText: "text-purple-700", value: "text-purple-700" },
  };
  const t = tones[tone] || tones.slate;

  return (
    <div
      className={[
        "rounded-2xl border shadow-sm bg-white p-5 transition-all",
        highlight ? "border-amber-300 shadow-md" : "border-slate-200 hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-slate-600">{label}</div>
          <div className={["mt-2 text-2xl font-bold", t.value].join(" ")}>
            {value}
          </div>
          {sublabel ? <div className="mt-1 text-xs text-slate-500">{sublabel}</div> : null}
        </div>
        {icon ? (
          <div className={["w-10 h-10 rounded-xl flex items-center justify-center", t.iconBg, t.iconText].join(" ")}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}


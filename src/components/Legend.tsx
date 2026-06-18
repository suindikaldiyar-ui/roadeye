import { SEVERITY_COLORS, SEVERITY_LABELS } from "@/lib/constants";
import type { Severity } from "@/lib/types";

const ORDER: Severity[] = ["high", "medium", "low"];

export default function Legend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Серьёзность
      </p>
      <ul className="space-y-1">
        {ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2 text-xs text-slate-700">
            <span
              className="h-3 w-3 rounded-full border border-white shadow"
              style={{ backgroundColor: SEVERITY_COLORS[s] }}
            />
            {SEVERITY_LABELS[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}

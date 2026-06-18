import type { Defect } from "@/lib/types";
import { SEVERITY_COLORS } from "@/lib/constants";

function StatItem({
  label,
  value,
  dotColor,
  accent,
}: {
  label: string;
  value: number;
  dotColor?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      {dotColor && (
        <span
          className="h-2.5 w-2.5 shrink-0 self-center rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <span
        className={`text-xl font-semibold tabular-nums ${accent ?? "text-slate-900"}`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-8 w-px bg-slate-200 sm:block" />;
}

export default function StatsBar({ defects }: { defects: Defect[] }) {
  const total = defects.length;

  const bySeverity = {
    high: defects.filter((d) => d.severity === "high").length,
    medium: defects.filter((d) => d.severity === "medium").length,
    low: defects.filter((d) => d.severity === "low").length,
  };

  const byStatus = {
    new: defects.filter((d) => d.status === "new").length,
    in_progress: defects.filter((d) => d.status === "in_progress").length,
    fixed: defects.filter((d) => d.status === "fixed").length,
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <StatItem label="всего дефектов" value={total} />
      <Divider />
      <StatItem label="высокая" value={bySeverity.high} dotColor={SEVERITY_COLORS.high} />
      <StatItem label="средняя" value={bySeverity.medium} dotColor={SEVERITY_COLORS.medium} />
      <StatItem label="низкая" value={bySeverity.low} dotColor={SEVERITY_COLORS.low} />
      <Divider />
      <StatItem label="новые" value={byStatus.new} accent="text-blue-600" />
      <StatItem label="в работе" value={byStatus.in_progress} accent="text-amber-600" />
      <StatItem label="устранено" value={byStatus.fixed} accent="text-emerald-600" />
    </div>
  );
}

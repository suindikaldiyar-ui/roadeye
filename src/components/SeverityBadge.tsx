import type { Severity } from "@/lib/types";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "@/lib/constants";

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-black/5"
      style={{
        backgroundColor: `${SEVERITY_COLORS[severity]}1A`, // ~10% alpha
        color: SEVERITY_COLORS[severity],
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: SEVERITY_COLORS[severity] }}
      />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

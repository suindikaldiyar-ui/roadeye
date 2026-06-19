import { formatConfidence } from "@/lib/constants";

/** Бейдж для дефектов, распознанных ИИ */
export default function AiBadge({
  confidence,
}: {
  confidence: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-600/20">
      <span aria-hidden>✦</span>
      ИИ
      {confidence != null && (
        <span className="font-medium normal-case tabular-nums text-violet-500">
          {formatConfidence(confidence)}
        </span>
      )}
    </span>
  );
}

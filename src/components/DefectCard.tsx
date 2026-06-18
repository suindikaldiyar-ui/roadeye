"use client";

import type { Defect } from "@/lib/types";
import {
  TYPE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDate,
} from "@/lib/constants";
import SeverityBadge from "./SeverityBadge";

export default function DefectCard({
  defect,
  active,
  onClick,
}: {
  defect: Defect;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-slate-400 bg-slate-50 ring-1 ring-slate-300"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {TYPE_LABELS[defect.type]}
        </span>
        <SeverityBadge severity={defect.severity} />
      </div>

      <p className="mt-1 line-clamp-1 text-xs text-slate-600">
        {defect.address ?? "Адрес не указан"}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {formatDate(defect.detected_at)}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
            STATUS_STYLES[defect.status]
          }`}
        >
          {STATUS_LABELS[defect.status]}
        </span>
      </div>
    </button>
  );
}

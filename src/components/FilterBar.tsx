"use client";

import type { DefectType, Severity, DefectStatus } from "@/lib/types";
import {
  TYPE_ORDER,
  SEVERITY_ORDER,
  STATUS_ORDER,
  TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  SEVERITY_COLORS,
} from "@/lib/constants";

export interface Filters {
  types: Set<DefectType>;
  severities: Set<Severity>;
  statuses: Set<DefectStatus>;
}

export type FilterCategory = keyof Filters;

interface ChipProps {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}

function Chip({ label, active, color, onClick }: ChipProps) {
  const style =
    active && color
      ? { backgroundColor: color, borderColor: color, color: "#fff" }
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? color
            ? "" // цвет задаётся через style
            : "border-slate-800 bg-slate-800 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
      }`}
    >
      {color && !active && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export default function FilterBar({
  filters,
  onToggle,
  onReset,
}: {
  filters: Filters;
  onToggle: (category: FilterCategory, value: string) => void;
  onReset: () => void;
}) {
  const isActive =
    filters.types.size > 0 ||
    filters.severities.size > 0 ||
    filters.statuses.size > 0;

  return (
    <div className="screen-only flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-slate-200 bg-white px-5 py-2.5">
      <Group title="Тип">
        {TYPE_ORDER.map((t) => (
          <Chip
            key={t}
            label={TYPE_LABELS[t]}
            active={filters.types.has(t)}
            onClick={() => onToggle("types", t)}
          />
        ))}
      </Group>

      <Group title="Серьёзность">
        {SEVERITY_ORDER.map((s) => (
          <Chip
            key={s}
            label={SEVERITY_LABELS[s]}
            color={SEVERITY_COLORS[s]}
            active={filters.severities.has(s)}
            onClick={() => onToggle("severities", s)}
          />
        ))}
      </Group>

      <Group title="Статус">
        {STATUS_ORDER.map((st) => (
          <Chip
            key={st}
            label={STATUS_LABELS[st]}
            active={filters.statuses.has(st)}
            onClick={() => onToggle("statuses", st)}
          />
        ))}
      </Group>

      <button
        type="button"
        onClick={onReset}
        disabled={!isActive}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path
            d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-2M19 15a8 8 0 01-14 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Сбросить фильтры
      </button>
    </div>
  );
}

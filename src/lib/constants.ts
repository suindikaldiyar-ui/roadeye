import type { DefectType, Severity, DefectStatus } from "./types";

/** Центр и зум карты — город Уральск / Орал */
export const MAP_CENTER: [number, number] = [51.23, 51.39];
export const MAP_ZOOM = 13;
export const MAP_FLY_ZOOM = 16;

/** Цвета маркеров и бейджей по серьёзности */
export const SEVERITY_COLORS: Record<Severity, string> = {
  high: "#dc2626", // красный
  medium: "#f59e0b", // оранжевый
  low: "#eab308", // жёлтый
};

/** Порядок перебора для фильтров и таблицы отчёта */
export const TYPE_ORDER: DefectType[] = ["pothole", "crack", "manhole"];
export const SEVERITY_ORDER: Severity[] = ["high", "medium", "low"];
export const STATUS_ORDER: DefectStatus[] = ["new", "in_progress", "fixed"];

/** Русские подписи */
export const TYPE_LABELS: Record<DefectType, string> = {
  pothole: "Яма",
  crack: "Трещина",
  manhole: "Люк",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
};

export const STATUS_LABELS: Record<DefectStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  fixed: "Устранено",
};

/** Цветовые классы статусов для бейджей */
export const STATUS_STYLES: Record<DefectStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-600/20",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
  fixed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

/** Форматирование даты в ru-RU */
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

/** Уверенность ИИ (0..1) → «NN %» */
export function formatConfidence(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)} %`;
}

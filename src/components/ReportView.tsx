"use client";

import type { Defect } from "@/lib/types";
import {
  TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  SEVERITY_COLORS,
  SEVERITY_ORDER,
  STATUS_ORDER,
  formatDate,
} from "@/lib/constants";

const reportDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ReportView({
  defects,
  onClose,
}: {
  defects: Defect[];
  onClose: () => void;
}) {
  const generatedAt = reportDateFormatter.format(new Date());

  const bySeverity = SEVERITY_ORDER.map((s) => ({
    key: s,
    label: SEVERITY_LABELS[s],
    color: SEVERITY_COLORS[s],
    count: defects.filter((d) => d.severity === s).length,
  }));

  const byStatus = STATUS_ORDER.map((st) => ({
    key: st,
    label: STATUS_LABELS[st],
    count: defects.filter((d) => d.status === st).length,
  }));

  return (
    <div className="print-area fixed inset-0 z-[2000] overflow-auto bg-white">
      {/* Тулбар — не печатается */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <span className="text-sm font-medium text-slate-500">
          Предпросмотр отчёта
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Печать / Сохранить в PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Документ */}
      <div className="mx-auto max-w-4xl px-8 py-8 text-slate-900">
        <header className="border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">
            Отчёт по дефектам дорог · Уральск / Орал
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Дата формирования: {generatedAt}
          </p>
        </header>

        {/* Сводка */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Сводка
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Всего дефектов</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {defects.length}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">По серьёзности</p>
              <ul className="mt-2 space-y-1 text-sm">
                {bySeverity.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.label}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">По статусу</p>
              <ul className="mt-2 space-y-1 text-sm">
                {byStatus.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{row.label}</span>
                    <span className="font-semibold tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Таблица */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Перечень дефектов
          </h2>
          <table className="report-table mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">№</th>
                <th className="py-2 pr-3 font-semibold">Тип</th>
                <th className="py-2 pr-3 font-semibold">Серьёзность</th>
                <th className="py-2 pr-3 font-semibold">Адрес</th>
                <th className="py-2 pr-3 font-semibold">Дата</th>
                <th className="py-2 font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {defects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Нет дефектов, удовлетворяющих фильтрам
                  </td>
                </tr>
              ) : (
                defects.map((d, i) => (
                  <tr key={d.id} className="border-b border-slate-200">
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-3">{TYPE_LABELS[d.type]}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: SEVERITY_COLORS[d.severity] }}
                        />
                        {SEVERITY_LABELS[d.severity]}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{d.address ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatDate(d.detected_at)}
                    </td>
                    <td className="py-2">{STATUS_LABELS[d.status]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
          RoadEye · Мониторинг дефектов дорог
        </footer>
      </div>
    </div>
  );
}

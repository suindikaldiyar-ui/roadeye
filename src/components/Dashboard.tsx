"use client";

import { useMemo, useState } from "react";
import type { Defect } from "@/lib/types";
import Header from "./Header";
import DefectList from "./DefectList";
import MapView from "./MapView.dynamic";
import FilterBar, { type Filters, type FilterCategory } from "./FilterBar";
import ReportView from "./ReportView";
import UploadModal from "./UploadModal";

const emptyFilters = (): Filters => ({
  types: new Set(),
  severities: new Set(),
  statuses: new Set(),
});

export default function Dashboard({ defects }: { defects: Defect[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  // Активная вкладка на узком экране (на десктопе показываются обе панели)
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");

  const filteredDefects = useMemo(() => {
    return defects.filter(
      (d) =>
        (filters.types.size === 0 || filters.types.has(d.type)) &&
        (filters.severities.size === 0 || filters.severities.has(d.severity)) &&
        (filters.statuses.size === 0 || filters.statuses.has(d.status))
    );
  }, [defects, filters]);

  // Если выбранный дефект выпал из фильтра — снимаем выбор
  const visibleSelectedId =
    selectedId && filteredDefects.some((d) => d.id === selectedId)
      ? selectedId
      : null;

  function handleToggle(category: FilterCategory, value: string) {
    setFilters((prev) => {
      const next = {
        types: new Set(prev.types),
        severities: new Set(prev.severities),
        statuses: new Set(prev.statuses),
      } as Filters;
      const set = next[category] as Set<string>;
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return next;
    });
  }

  function handleReset() {
    setFilters(emptyFilters());
  }

  // Выбор карточки из списка на мобиле — переключаемся на карту, чтобы увидеть маркер
  function handleSelectFromList(id: string) {
    setSelectedId(id);
    setMobileTab("map");
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <div className="screen-only flex min-h-0 flex-1 flex-col">
        <Header
          defects={filteredDefects}
          onOpenReport={() => setReportOpen(true)}
          onOpenUpload={() => setUploadOpen(true)}
        />

        <FilterBar
          filters={filters}
          onToggle={handleToggle}
          onReset={handleReset}
        />

        {/* Переключатель вкладок — только на узком экране */}
        <div className="flex gap-1 border-b border-slate-200 bg-white p-1.5 md:hidden">
          {(["map", "list"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              aria-pressed={mobileTab === tab}
              className={`min-h-[44px] flex-1 rounded-lg text-sm font-medium transition-colors ${
                mobileTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab === "map" ? "Карта" : `Список (${filteredDefects.length})`}
            </button>
          ))}
        </div>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Боковая панель — список */}
          <aside
            className={`min-h-0 w-full shrink-0 border-slate-200 bg-white md:flex md:w-80 md:flex-none md:border-r ${
              mobileTab === "list" ? "flex flex-1" : "hidden"
            }`}
          >
            <DefectList
              defects={filteredDefects}
              selectedId={visibleSelectedId}
              onSelect={handleSelectFromList}
            />
          </aside>

          {/* Карта */}
          <section
            className={`relative h-[60vh] w-full md:h-full md:flex-1 ${
              mobileTab === "map" ? "block" : "hidden"
            } md:block`}
          >
            <MapView
              defects={filteredDefects}
              selectedId={visibleSelectedId}
              onSelect={setSelectedId}
            />
          </section>
        </main>
      </div>

      {reportOpen && (
        <ReportView
          defects={filteredDefects}
          onClose={() => setReportOpen(false)}
        />
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

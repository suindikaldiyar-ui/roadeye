"use client";

import { useEffect, useRef } from "react";
import type { Defect } from "@/lib/types";
import DefectCard from "./DefectCard";

export default function DefectList({
  defects,
  selectedId,
  onSelect,
}: {
  defects: Defect[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Прокрутить к выбранной карточке (например, при клике по маркеру на карте)
  useEffect(() => {
    if (!selectedId) return;
    itemRefs.current[selectedId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">Дефекты</h2>
        <span className="text-xs text-slate-400">{defects.length}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {defects.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-slate-400">
            Дефекты не найдены
          </p>
        ) : (
          defects.map((d) => (
            <div
              key={d.id}
              ref={(el) => {
                itemRefs.current[d.id] = el;
              }}
            >
              <DefectCard
                defect={d}
                active={d.id === selectedId}
                onClick={() => onSelect(d.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Defect } from "@/lib/types";
import Header from "./Header";
import DefectList from "./DefectList";
import MapView from "./MapView.dynamic";

export default function Dashboard({ defects }: { defects: Defect[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header defects={defects} />

      <main className="flex flex-1 overflow-hidden">
        {/* Боковая панель — список */}
        <aside className="w-80 shrink-0 border-r border-slate-200 bg-white">
          <DefectList
            defects={defects}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        {/* Карта */}
        <section className="relative flex-1">
          <MapView
            defects={defects}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>
      </main>
    </div>
  );
}

import type { Defect } from "@/lib/types";
import StatsBar from "./StatsBar";

export default function Header({ defects }: { defects: Defect[] }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-col gap-4 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            {/* простой «глаз»-логотип */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="12" r="2.8" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">
              RoadEye
            </h1>
            <p className="text-xs text-slate-500">
              Мониторинг дефектов дорог · Уральск / Орал
            </p>
          </div>
        </div>

        <StatsBar defects={defects} />
      </div>
    </header>
  );
}

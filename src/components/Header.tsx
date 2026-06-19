import type { Defect } from "@/lib/types";
import StatsBar from "./StatsBar";

export default function Header({
  defects,
  onOpenReport,
  onOpenUpload,
}: {
  defects: Defect[];
  onOpenReport: () => void;
  onOpenUpload: () => void;
}) {
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

        <div className="flex items-center gap-5">
          <StatsBar defects={defects} />
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12L8 8m4-4l4 4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Загрузить фото
          </button>
          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5M9 13h6M9 17h6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Отчёт
          </button>
        </div>
      </div>
    </header>
  );
}

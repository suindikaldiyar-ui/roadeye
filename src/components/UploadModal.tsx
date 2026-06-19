"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DefectType, Severity } from "@/lib/types";
import {
  TYPE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  MAP_CENTER,
} from "@/lib/constants";

interface AiDefect {
  type: DefectType;
  severity: Severity;
  confidence: number;
  note: string;
}

type Phase = "form" | "loading" | "done";

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<number>(MAP_CENTER[0]);
  const [longitude, setLongitude] = useState<number>(MAP_CENTER[1]);
  const [address, setAddress] = useState("");

  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AiDefect[]>([]);
  const [saved, setSaved] = useState(0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      // "data:image/jpeg;base64,XXXX" → отрезаем префикс
      const comma = dataUrl.indexOf(",");
      setBase64(dataUrl.slice(comma + 1));
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!base64 || !mimeType) {
      setError("Сначала выберите изображение.");
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          latitude,
          longitude,
          address,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось проанализировать фото.");
        setPhase("form");
        return;
      }
      setResults(data.defects ?? []);
      setSaved(data.saved ?? 0);
      setPhase("done");
    } catch {
      setError("Сетевая ошибка при обращении к серверу.");
      setPhase("form");
    }
  }

  function handleDone() {
    // Обновляем серверный компонент → новые маркеры/карточки появятся
    router.refresh();
    onClose();
  }

  const canAnalyze = !!base64 && phase === "form";

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">
            Распознавание дефектов на фото
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Этап результата */}
          {phase === "done" ? (
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Дефектов не обнаружено
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ИИ не нашёл ям, трещин или повреждённых люков на фото.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    ИИ нашёл дефектов: {results.length}
                    {saved > 0 && (
                      <span className="text-slate-400">
                        {" "}
                        · сохранено в базу: {saved}
                      </span>
                    )}
                  </p>
                  <ul className="space-y-2">
                    {results.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-sm text-slate-800">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: SEVERITY_COLORS[d.severity],
                            }}
                          />
                          <span className="font-medium">
                            {TYPE_LABELS[d.type]}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span style={{ color: SEVERITY_COLORS[d.severity] }}>
                            {SEVERITY_LABELS[d.severity]}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="tabular-nums text-slate-600">
                            {Math.round(d.confidence * 100)}%
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {results.some((d) => d.note) && (
                    <ul className="space-y-1 text-xs text-slate-500">
                      {results.map(
                        (d, i) =>
                          d.note && (
                            <li key={i}>
                              {TYPE_LABELS[d.type]}: {d.note}
                            </li>
                          )
                      )}
                    </ul>
                  )}
                </>
              )}

              {error && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {error}
                </p>
              )}
            </div>
          ) : (
            // Этап формы / загрузки
            <div className="space-y-4">
              {/* Выбор файла + превью */}
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={phase === "loading"}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Превью"
                      className="max-h-48 rounded-md object-contain"
                    />
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        className="h-8 w-8 text-slate-400"
                        fill="none"
                      >
                        <path
                          d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Выберите фото дорожного покрытия
                    </>
                  )}
                  {preview && (
                    <span className="text-xs text-slate-400">
                      Нажмите, чтобы заменить
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              {/* Координаты */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Широта (latitude)
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    disabled={phase === "loading"}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-slate-500 disabled:bg-slate-50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Долгота (longitude)
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    disabled={phase === "loading"}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-slate-500 disabled:bg-slate-50"
                  />
                </label>
              </div>

              {/* Адрес */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Адрес (необязательно)
                </span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Напр. ул. Достык, 12"
                  disabled={phase === "loading"}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50"
                />
              </label>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Подвал с кнопками */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {phase === "done" ? (
            <button
              type="button"
              onClick={handleDone}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Готово
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={phase === "loading"}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {phase === "loading" && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
                {phase === "loading" ? "Анализирую…" : "Анализировать"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

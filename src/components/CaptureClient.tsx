"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DefectType, Severity } from "@/lib/types";
import { TYPE_LABELS, SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/constants";

interface AiDefect {
  type: DefectType;
  severity: Severity;
  confidence: number;
  note: string;
}

const WARN_EVERY = 80; // порог предупреждения о расходе

type CamState = "idle" | "ready" | "denied" | "unsupported";

export default function CaptureClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const warnThresholdRef = useRef(WARN_EVERY);

  const [camState, setCamState] = useState<CamState>("idle");
  const [camError, setCamError] = useState<string | null>(null);

  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [intervalSec, setIntervalSec] = useState(5);
  const [recording, setRecording] = useState(false);

  const [sentFrames, setSentFrames] = useState(0);
  const [defectsFound, setDefectsFound] = useState(0);
  const [lastResult, setLastResult] = useState<string>("—");
  const [warnOpen, setWarnOpen] = useState(false);

  // --- Камера ---
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("unsupported");
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState("ready");
      })
      .catch((err) => {
        setCamState("denied");
        setCamError(err?.message ?? "Доступ к камере запрещён.");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // --- GPS ---
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Геолокация не поддерживается этим устройством.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Доступ к геолокации запрещён. Разрешите доступ к местоположению."
            : "Не удалось получить координаты."
        );
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // --- Захват одного кадра и отправка ---
  const captureAndSend = useCallback(async () => {
    if (inFlightRef.current) return; // не наслаиваем запросы
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !coords) return;
    if (!video.videoWidth) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);

    inFlightRef.current = true;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
          latitude: coords.lat,
          longitude: coords.lng,
          address: "Маршрут (авто)",
        }),
      });
      const data = await res.json();

      setSentFrames((n) => {
        const next = n + 1;
        if (next >= warnThresholdRef.current) {
          // авто-пауза с предупреждением
          stopTimer();
          setRecording(false);
          setWarnOpen(true);
        }
        return next;
      });

      if (!res.ok) {
        setLastResult(`ошибка кадра: ${data.error ?? res.status}`);
        return;
      }

      const found: AiDefect[] = data.defects ?? [];
      if (found.length === 0) {
        setLastResult("чисто");
      } else {
        setDefectsFound((n) => n + found.length);
        const top = [...found].sort((a, b) => b.confidence - a.confidence)[0];
        setLastResult(
          `Яма/дефект: ${TYPE_LABELS[top.type]} · ${
            SEVERITY_LABELS[top.severity]
          } · ${Math.round(top.confidence * 100)}%`
        );
      }
    } catch {
      setLastResult("ошибка сети");
    } finally {
      inFlightRef.current = false;
    }
  }, [coords]);

  // captureAndSend держим в ref, чтобы интервал всегда звал свежую версию
  const captureRef = useRef(captureAndSend);
  useEffect(() => {
    captureRef.current = captureAndSend;
  }, [captureAndSend]);

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startRecording() {
    if (!coords) return;
    setRecording(true);
    // первый кадр сразу, затем по интервалу
    captureRef.current();
    intervalRef.current = setInterval(() => {
      captureRef.current();
    }, intervalSec * 1000);
  }

  function stopRecording() {
    stopTimer();
    setRecording(false);
  }

  function continueAfterWarn() {
    warnThresholdRef.current += WARN_EVERY;
    setWarnOpen(false);
    startRecording();
  }

  function stopAfterWarn() {
    setWarnOpen(false);
    // запись уже на паузе
  }

  // чистим интервал при размонтировании
  useEffect(() => () => stopTimer(), []);

  const canRecord = camState === "ready" && !!coords;

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Назад к дашборду
        </Link>
        <span className="text-sm font-semibold tracking-wide">
          Запись маршрута
        </span>
      </div>

      {/* Превью камеры */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {camState !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 px-6 text-center">
            {camState === "idle" && (
              <p className="text-sm text-slate-300">Запрашиваю доступ к камере…</p>
            )}
            {camState === "unsupported" && (
              <p className="text-sm text-amber-300">
                Камера не поддерживается. Откройте страницу на телефоне по HTTPS
                (адрес Vercel).
              </p>
            )}
            {camState === "denied" && (
              <>
                <p className="text-sm font-medium text-red-300">
                  Нет доступа к камере
                </p>
                <p className="text-xs text-slate-400">
                  {camError} Нужен телефон и разрешение на камеру. Камера работает
                  только по HTTPS (адрес Vercel) или на localhost.
                </p>
              </>
            )}
          </div>
        )}

        {/* GPS-плашка поверх превью */}
        <div className="absolute left-3 top-3 rounded-lg bg-black/55 px-2.5 py-1.5 text-xs backdrop-blur">
          {coords ? (
            <span className="tabular-nums">
              📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±
              {Math.round(coords.accuracy)} м
            </span>
          ) : (
            <span className="text-amber-300">📍 {gpsError ?? "поиск GPS…"}</span>
          )}
        </div>

        {recording && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            REC
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-slate-400">Отправлено кадров</p>
          <p className="text-2xl font-bold tabular-nums">{sentFrames}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-slate-400">Найдено дефектов</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-400">
            {defectsFound}
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-slate-400">Последний кадр</p>
          <p className="text-sm font-medium">{lastResult}</p>
        </div>
      </div>

      {/* Интервал */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Интервал съёмки</span>
          <span className="font-semibold tabular-nums">{intervalSec} сек</span>
        </div>
        <input
          type="range"
          min={3}
          max={15}
          step={1}
          value={intervalSec}
          disabled={recording}
          onChange={(e) => setIntervalSec(Number(e.target.value))}
          className="mt-2 w-full accent-emerald-500 disabled:opacity-50"
        />
      </div>

      {/* Кнопки */}
      <div className="mt-auto px-4 pb-6 pt-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!canRecord}
            className="w-full rounded-2xl bg-emerald-500 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
          >
            {canRecord
              ? "Начать запись"
              : !coords
              ? "Ожидание GPS…"
              : "Нет камеры"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full rounded-2xl bg-red-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-red-500"
          >
            Остановить
          </button>
        )}
        <p className="mt-3 text-center text-xs text-slate-500">
          Каждый кадр отправляется в ИИ. На телефоне открывайте по HTTPS (адрес
          Vercel).
        </p>
      </div>

      {/* Предупреждение о расходе */}
      {warnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900">
            <h3 className="text-base font-semibold">Высокий расход</h3>
            <p className="mt-2 text-sm text-slate-600">
              Отправлено {sentFrames} кадров. Каждый кадр = запрос к ИИ.
              Продолжить запись?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={stopAfterWarn}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Остановить
              </button>
              <button
                type="button"
                onClick={continueAfterWarn}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

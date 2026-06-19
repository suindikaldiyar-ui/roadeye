"use client";

import dynamic from "next/dynamic";

// getUserMedia / geolocation — только в браузере (ssr: false)
const CaptureClient = dynamic(() => import("@/components/CaptureClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-400">
      Загрузка…
    </div>
  ),
});

export default function CapturePage() {
  return <CaptureClient />;
}

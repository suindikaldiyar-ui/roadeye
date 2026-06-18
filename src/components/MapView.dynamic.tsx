"use client";

import dynamic from "next/dynamic";

// Leaflet обращается к window — рендерим только на клиенте (ssr: false)
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm text-slate-500">
      Загрузка карты…
    </div>
  ),
});

export default MapView;

"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Defect } from "@/lib/types";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_FLY_ZOOM,
  SEVERITY_COLORS,
  TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  formatDate,
  formatConfidence,
} from "@/lib/constants";
import Legend from "./Legend";

function makeIcon(color: string, active: boolean): L.DivIcon {
  const size = active ? 20 : 16;
  return L.divIcon({
    className: "",
    html: `<span class="roadeye-marker ${
      active ? "roadeye-marker--active" : ""
    }" style="display:block;width:${size}px;height:${size}px;background:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Центрирует карту на выбранном дефекте */
function MapController({
  selected,
}: {
  selected: Defect | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    map.flyTo([selected.latitude, selected.longitude], MAP_FLY_ZOOM, {
      duration: 0.8,
    });
  }, [selected, map]);
  return null;
}

/**
 * Пересчитывает размер карты, когда контейнер меняет размеры
 * (например, при переключении вкладок Карта/Список на мобиле — display:none → block).
 */
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function MapView({
  defects,
  selectedId,
  onSelect,
}: {
  defects: Defect[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const selected = useMemo(
    () => defects.find((d) => d.id === selectedId) ?? null,
    [defects, selectedId]
  );

  // Открыть попап выбранного маркера
  useEffect(() => {
    if (!selectedId) return;
    const marker = markerRefs.current[selectedId];
    // даём карте долететь, затем открываем попап
    const t = setTimeout(() => marker?.openPopup(), 400);
    return () => clearTimeout(t);
  }, [selectedId]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selected={selected} />
        <ResizeHandler />

        {defects.map((d) => (
          <Marker
            key={d.id}
            position={[d.latitude, d.longitude]}
            icon={makeIcon(SEVERITY_COLORS[d.severity], d.id === selectedId)}
            ref={(ref) => {
              markerRefs.current[d.id] = ref;
            }}
            eventHandlers={{ click: () => onSelect(d.id) }}
          >
            <Popup>
              <div className="space-y-1">
                {d.photo_url && (
                  <a
                    href={d.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.photo_url}
                      alt="Фото дефекта"
                      className="h-[120px] w-full rounded-md object-cover"
                    />
                  </a>
                )}
                <p className="text-sm font-semibold text-slate-900">
                  {TYPE_LABELS[d.type]}
                </p>
                <p className="text-xs">
                  <span className="text-slate-500">Серьёзность: </span>
                  <span style={{ color: SEVERITY_COLORS[d.severity] }}>
                    {SEVERITY_LABELS[d.severity]}
                  </span>
                </p>
                <p className="text-xs text-slate-600">
                  {d.address ?? "Адрес не указан"}
                </p>
                <p className="text-[11px] tabular-nums text-slate-400">
                  📍 {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
                </p>
                <p className="text-xs text-slate-500">{formatDate(d.detected_at)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">Статус: </span>
                  {STATUS_LABELS[d.status]}
                </p>
                {d.source === "ai" && (
                  <p className="text-xs font-medium text-violet-700">
                    ✦ ИИ · {formatConfidence(d.ai_confidence)}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[1000]">
        <div className="pointer-events-auto">
          <Legend />
        </div>
      </div>
    </div>
  );
}

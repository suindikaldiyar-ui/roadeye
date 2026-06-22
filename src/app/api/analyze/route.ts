import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabaseClient";
import type { DefectType, Severity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high"];

const PROMPT = `Ты — эксперт по обследованию дорожного покрытия. Найди на фото ТОЛЬКО реальные,
чётко видимые дефекты дороги.

Типы:
- "яма" — выраженная выбоина с разрушенными краями и заметной глубиной.
- "трещина" — видимые линейные трещины или сетка трещин в покрытии.
- "люк" — открытый, повреждённый, провалившийся или отсутствующий люк.

ПРАВИЛА:
- Сообщай о дефекте ТОЛЬКО если он чётко виден. Сомневаешься — не добавляй.
- Если дорога в нормальном состоянии — верни пустой массив []. Не выдумывай дефекты.
- НЕ дефекты: швы между плитами, разметка, тени, мокрый асфальт, следы шин,
  целые люки вровень с покрытием, обычная шероховатость асфальта, гравий на обочине.
- confidence ставь честно: 0.8–1.0 только для явных дефектов; неуверен — не добавляй.

severity:
- "high" — крупная/глубокая яма, широкая сетка трещин, открытый люк (опасно).
- "medium" — заметный, но не опасный немедленно.
- "low" — мелкий поверхностный износ.

Верни СТРОГО JSON-массив без markdown:
[{"type":"яма|трещина|люк","severity":"low|medium|high","confidence":0.0–1.0}]
Дефектов нет — верни [].`;

/** Минимальная уверенность ИИ для сохранения дефекта */
const MIN_CONFIDENCE = 0.7;

/** Русские типы из ответа модели → внутренние английские значения (формат БД не меняем) */
const TYPE_MAP: Record<string, DefectType> = {
  яма: "pothole",
  трещина: "crack",
  люк: "manhole",
  // на случай, если модель вернёт по-английски
  pothole: "pothole",
  crack: "crack",
  manhole: "manhole",
};

interface AiDefect {
  type: DefectType;
  severity: Severity;
  confidence: number;
  note: string;
}

/** Достаём массив из ответа модели: либо сам массив, либо { defects: [...] } */
function extractArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.defects)) return obj.defects;
  }
  return [];
}

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  pedestrian?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
}

/** Собираем человекочитаемый адрес из частей ответа Nominatim */
function buildAddress(addr: NominatimAddress | undefined): string | null {
  if (!addr) return null;
  const street = addr.road ?? addr.pedestrian;
  const locality = addr.city ?? addr.town ?? addr.village ?? addr.suburb;
  const parts: string[] = [];
  if (street) {
    parts.push(addr.house_number ? `${street}, ${addr.house_number}` : street);
  }
  if (locality) parts.push(locality);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Обратное геокодирование через Nominatim (OSM), без ключа.
 * Любая ошибка/таймаут/пустой ответ → null (не бросает исключение).
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lon}&accept-language=ru`;

  console.log("[geocode] запрос к Nominatim:", url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RoadEye/1.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    console.log("[geocode] HTTP статус:", res.status);

    if (!res.ok) {
      const errText = await res.text().catch(() => "(не удалось прочитать тело)");
      console.error("[geocode] не-OK ответ:", res.status, errText);
      return null;
    }

    const data = (await res.json()) as {
      display_name?: string;
      address?: NominatimAddress;
    };
    console.log("[geocode] тело ответа:", JSON.stringify(data));

    const resolved = buildAddress(data.address) ?? data.display_name ?? null;
    console.log("[geocode] итоговый адрес:", resolved);
    return resolved;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[geocode] Nominatim timeout");
    } else {
      console.error(
        "[geocode] ошибка запроса:",
        err instanceof Error ? err.message : String(err)
      );
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const PHOTO_BUCKET = "defect-photos";

/**
 * Загрузка кадра в публичный Storage-bucket через anon-клиент (best-effort).
 * При любой ошибке → null (дефект всё равно сохранится), ошибка в лог [photo].
 */
async function uploadFrame(imageBase64: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(imageBase64, "base64");
    const name = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(name, buffer, { contentType: "image/jpeg" });
    if (error) {
      console.error("[photo] ошибка загрузки в Storage:", error.message);
      return null;
    }
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(name);
    console.log("[photo] загружено:", data.publicUrl);
    return data.publicUrl ?? null;
  } catch (err) {
    console.error(
      "[photo] исключение при загрузке:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

function normalize(items: unknown[]): AiDefect[] {
  const result: AiDefect[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const rawType =
      typeof obj.type === "string" ? obj.type.trim().toLowerCase() : "";
    const type = TYPE_MAP[rawType];
    const severity = obj.severity as Severity;
    if (!type) continue; // нераспознанный тип
    if (!VALID_SEVERITIES.includes(severity)) continue;
    result.push({
      type,
      severity,
      confidence: clampConfidence(obj.confidence),
      note: typeof obj.note === "string" ? obj.note : "",
    });
  }
  return result;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Не задан GEMINI_API_KEY на сервере." },
      { status: 500 }
    );
  }

  let body: {
    imageBase64?: string;
    mimeType?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректное тело запроса." },
      { status: 400 }
    );
  }

  // address из тела — запасной вариант, если геокодер ничего не вернёт
  const { imageBase64, mimeType, latitude, longitude, address } = body;

  if (!imageBase64 || !mimeType) {
    return NextResponse.json(
      { error: "Не передано изображение." },
      { status: 400 }
    );
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "Не заданы координаты (latitude/longitude)." },
      { status: 400 }
    );
  }

  // --- Вызов Gemini ---
  let rawText: string;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });
    rawText = response.text ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "неизвестная ошибка";
    return NextResponse.json(
      { error: `Ошибка обращения к Gemini: ${message}` },
      { status: 502 }
    );
  }

  // --- Парсинг ответа ---
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Модель вернула некорректный JSON. Попробуйте другое фото." },
      { status: 502 }
    );
  }

  // Порог уверенности: ниже MIN_CONFIDENCE считаем ложным срабатыванием
  const found = normalize(extractArray(parsed)).filter(
    (d) => d.confidence >= MIN_CONFIDENCE
  );

  if (found.length === 0) {
    return NextResponse.json({ defects: [], saved: 0 });
  }

  // --- Адрес: геокодированный → ручной → null ---
  const manualAddress = address?.trim() ? address.trim() : null;
  const resolvedAddress =
    (await reverseGeocode(latitude, longitude)) ?? manualAddress;

  // --- Загрузка кадра в Storage (best-effort): один кадр → один photo_url ---
  const photoUrl = await uploadFrame(imageBase64);

  // --- Сохранение в Supabase ---
  const detectedAt = new Date().toISOString();
  const rows = found.map((d) => ({
    type: d.type,
    severity: d.severity,
    ai_confidence: d.confidence,
    latitude,
    longitude,
    address: resolvedAddress,
    photo_url: photoUrl,
    status: "new",
    source: "ai",
    detected_at: detectedAt,
  }));

  const { error: insertError } = await supabase.from("defects").insert(rows);

  if (insertError) {
    return NextResponse.json(
      {
        error: `Дефекты распознаны, но не сохранены: ${insertError.message}`,
        defects: found,
        saved: 0,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ defects: found, saved: found.length });
}

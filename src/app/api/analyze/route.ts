import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabaseClient";
import type { DefectType, Severity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: DefectType[] = ["pothole", "crack", "manhole"];
const VALID_SEVERITIES: Severity[] = ["low", "medium", "high"];

const PROMPT = `Ты — эксперт по обследованию дорожного покрытия. Проанализируй фотографию дороги и найди дефекты ТОЛЬКО трёх типов:
- "pothole" — яма / выбоина в покрытии;
- "crack" — трещина (одиночная или сетка трещин);
- "manhole" — открытый, проваленный или повреждённый канализационный/смотровой люк.

Для каждого найденного дефекта верни объект с полями:
- "type": один из "pothole" | "crack" | "manhole";
- "severity": "low" | "medium" | "high" — по размеру и опасности для движения;
- "confidence": число от 0 до 1 — уверенность в распознавании;
- "note": краткое описание дефекта на русском (1 предложение).

Если дефектов указанных типов на фото нет — верни пустой массив [].
Ответ верни СТРОГО как JSON-массив объектов, без какого-либо другого текста.`;

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

function normalize(items: unknown[]): AiDefect[] {
  const result: AiDefect[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const type = obj.type as DefectType;
    const severity = obj.severity as Severity;
    if (!VALID_TYPES.includes(type)) continue;
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

  const found = normalize(extractArray(parsed));

  if (found.length === 0) {
    return NextResponse.json({ defects: [], saved: 0 });
  }

  // --- Сохранение в Supabase ---
  const detectedAt = new Date().toISOString();
  const rows = found.map((d) => ({
    type: d.type,
    severity: d.severity,
    ai_confidence: d.confidence,
    latitude,
    longitude,
    address: address?.trim() ? address.trim() : null,
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

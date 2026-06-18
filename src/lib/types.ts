export type DefectType = "pothole" | "crack" | "manhole";
export type Severity = "low" | "medium" | "high";
export type DefectStatus = "new" | "in_progress" | "fixed";

export interface Defect {
  id: string;
  type: DefectType;
  severity: Severity;
  latitude: number;
  longitude: number;
  address: string | null;
  photo_url: string | null;
  status: DefectStatus;
  ai_confidence: number | null;
  detected_at: string;
  created_at: string;
}

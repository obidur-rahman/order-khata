/** Brand constants (docs/06): class chips, lane colors/labels, tint helper.
 * Static mirror of /api/config class_meta so chips render before the first
 * fetch; the server values remain authoritative for the threshold rules. */
import type { ClassKey, ClassMeta, Lane } from "./types";

export const CLASS_META: Record<ClassKey, ClassMeta> = {
  order: { label: "Order", color: "#2F6BFF" },
  price_question: { label: "Price", color: "#7A4DFF" },
  delivery_problem: { label: "Delivery", color: "#0FA3A3" },
  complaint: { label: "Complaint", color: "#FF4D8D" },
  scam: { label: "Scam", color: "#E5252A" },
  other: { label: "Other", color: "#8A8A8A" },
};

export interface LaneMeta {
  label: string; // docs/06 voice: plain, no AI jargon
  short: string;
  color: string;
}

export const LANE_META: Record<Lane, LaneMeta> = {
  auto: { label: "Handled for you", short: "Auto", color: "#17A34A" },
  review: { label: "Needs your eyes", short: "Review", color: "#F59E0B" },
  scam: { label: "Scam alerts", short: "Scam", color: "#E5252A" },
};

export const AVATAR_FALLBACK = "#2F6BFF";

/** 12% tint background for chips (docs/06 §2 rules). */
export function tint(hex: string, alpha = 0.12): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Darken text on tint for >= 4.5:1 contrast where the full color is too light. */
export function chipTextColor(hex: string): string {
  return hex;
}

export function classMeta(key: string): ClassMeta {
  return CLASS_META[key as ClassKey] ?? CLASS_META.other;
}

export function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function fmtClock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Brand constants (docs/06 "Editorial operations"): class chips, lane
 * labels, time formatters. The single source for chip colour, so chips render
 * before the first fetch. docs/06 §2 is explicit that no second palette lives
 * anywhere else — in particular not behind an API field (see docs/05).
 *
 * The palette is an ink-neutral base, a single electric-blue accent, and a
 * muted but real hue for each of the six classes so distributions read at a
 * glance. The accent always means "this needs your eyes / your action".
 * `scam` keeps a semantic red because it must read as a warning; every class
 * and lane is always paired with a label (and an icon for lanes) so color
 * never carries meaning alone (docs/06 §2, §7). */
import type { ClassKey, ClassMeta, Lane } from "./types";

export const CLASS_META: Record<ClassKey, ClassMeta> = {
  // values are runtime CSS variables (globals.css), so the ramp follows the
  // light/dark switch without a second palette living in TypeScript.
  order: { label: "Order", color: "var(--c-order)" },
  price_question: { label: "Price", color: "var(--c-price)" },
  delivery_problem: { label: "Delivery", color: "var(--c-delivery)" },
  complaint: { label: "Complaint", color: "var(--c-complaint)" },
  scam: { label: "Scam", color: "var(--c-scam)" },
  other: { label: "Other", color: "var(--c-other)" },
};

export interface LaneMeta {
  color: string; // token: borders, dots, graphic fills
  deep: string; // for text and filled chips on paper/surface (docs/06 §2)
  icon: "check" | "eye" | "shield";
}

/* Labels, short names and blurbs live in lib/i18n.ts — they are visitor
   facing prose and have to switch language. Only the visual identity stays
   here, so there is exactly one English string for each lane. */
export const LANE_META: Record<Lane, LaneMeta> = {
  auto: {
    color: "var(--lane-auto)",
    deep: "var(--lane-auto-deep)",
    icon: "check",
  },
  review: {
    color: "var(--lane-review)",
    deep: "var(--lane-review-deep)",
    icon: "eye",
  },
  scam: {
    color: "var(--lane-scam)",
    deep: "var(--lane-scam-deep)",
    icon: "shield",
  },
};

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

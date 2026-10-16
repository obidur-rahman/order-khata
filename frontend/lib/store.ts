/** Client-side tau persistence so the slider value is consistent across
 * screens (Inbox / Try It / Dashboard / Evaluation all show "current tau"). */

const KEY = "order_khata.tau";

export function loadTau(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return fallback;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? Math.min(0.99, Math.max(0.5, v)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveTau(v: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(v));
  } catch {
    /* private mode etc. — non-fatal */
  }
}

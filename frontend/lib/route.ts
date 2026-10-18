/**
 * Routing policy — docs/04 §4. TypeScript twin of backend/app/router.py.
 *
 * The threshold slider recomputes lanes client-side with this module so
 * moving it costs zero network. Logic, constants and reason strings must be
 * byte-identical to the Python implementation; tests/test_parity.py feeds
 * the same fixture file to both and asserts identical output.
 */

import type { Lane } from "./types";

const LANE_AUTO = "auto";
const LANE_REVIEW = "review";
const LANE_SCAM = "scam";
const LLM_OK = "ok";

// docs/04 §4 — keep in sync with backend/app/config.py
export const TAU_DEFAULT = 0.85;
export const TAU_MIN = 0.5;
export const TAU_MAX = 0.99;
export const TAU_OTHER_MIN = 0.6;
export const TAU_OTHER_OFFSET = 0.2;
export const SCAM_T = 0.7;
export const ESCALATE_T = 0.2;
export const DECISIVE_T = 0.9;
export const DEGRADED_MARGIN = 0.05;
export const DEGRADED_MAX = 0.99;

export interface RouteSignals {
  top_class: string;
  top_prob: number;
  scam_prob: number;
  escalate_prob: number;
  llm_class?: string | null;
  llm_status?: string | null;
}

/** Half-up round to 2 decimals (slider precision), byte-identical to Python _r2. */
function r2(x: number): number {
  return Math.floor(x * 100 + 0.5) / 100;
}

/** tau_other = max(0.60, tau - 0.20) (docs/04 §4). */
export function tauOther(tau: number): number {
  return r2(Math.max(TAU_OTHER_MIN, tau - TAU_OTHER_OFFSET));
}

/** Rule-3 confidence threshold (docs/04 §4). Shared with the UI so the
 * confidence-bar tick always shows the value actually being enforced. */
export function requiredThreshold(
  topClass: string,
  tau: number,
  degraded: boolean,
): number {
  if (topClass === "other") return tauOther(tau);
  if (degraded) return Math.min(DEGRADED_MAX, r2(tau + DEGRADED_MARGIN));
  return tau;
}

/**
 * Format a probability for route reasons. Deterministic half-up rounding to
 * 2 decimals using pure IEEE double arithmetic, byte-identical to the Python
 * fmt_prob (Python's int() on a positive value truncates like Math.floor).
 */
export function fmtProb(x: number): string {
  const cents = Math.floor(x * 100 + 0.5);
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Apply the routing policy. Returns [lane, route_reason]. First match wins. */
export function route(signals: RouteSignals, tau: number = TAU_DEFAULT): [Lane, string] {
  const topClass = String(signals.top_class);
  const topProb = Number(signals.top_prob);
  const scamProb = Number(signals.scam_prob);
  const escalateProb = Number(signals.escalate_prob);
  const llmClass = signals.llm_class ?? null;
  const llmStatus = signals.llm_status ?? "unavailable";

  // 1. Scam lane — hard invariant: never auto, regardless of anything else.
  if (scamProb >= SCAM_T) {
    return [LANE_SCAM, `Scam probability ${fmtProb(scamProb)} >= ${fmtProb(SCAM_T)}`];
  }

  // 2. Escalate: customer may need a human.
  if (escalateProb >= ESCALATE_T) {
    return [LANE_REVIEW, "Customer may need a human"];
  }

  // Degraded mode: no usable second signal -> skip rule 4, stricter threshold.
  const degraded = llmStatus !== LLM_OK || !llmClass;

  // 3. Low confidence.
  const required = requiredThreshold(topClass, tau, degraded);
  if (topProb < required) {
    return [LANE_REVIEW, `Low confidence (p = ${fmtProb(topProb)})`];
  }

  // 4. Second opinion disagrees (skipped in degraded mode). The LLM is a
  // tie-breaker, not an oracle: it may only veto a call the model itself is
  // unsure about. Measured on D1 test (notebook 8.4) — of the calls it
  // disagreed with at top_prob >= 0.90 the model was right 96% of the time and
  // the LLM 23% — so vetoing those cost coverage AND accuracy.
  if (!degraded && String(llmClass) !== topClass && topProb < DECISIVE_T) {
    return [LANE_REVIEW, `Second opinion disagrees (LLM: ${llmClass})`];
  }

  // 5. Auto.
  if (degraded) {
    return [LANE_AUTO, "Confident (stricter threshold; second opinion unavailable)"];
  }
  return [LANE_AUTO, "Confident and second opinion agrees"];
}

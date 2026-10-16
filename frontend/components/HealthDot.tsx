"use client";
/** Health dot + degraded banner (docs/06 §4.2, F11): model state and second-
 * signal availability. Status always carries icon + text, not just color. */
import type { HealthResponse } from "@/lib/types";
import { AlertIcon } from "./icons";

export function HealthDot({ health }: { health: HealthResponse | null }) {
  if (!health || !health.model_loaded) {
    return (
      <span className="label inline-flex items-center gap-1.5 text-muted" title="Warming up">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted" aria-hidden />
        warming up
      </span>
    );
  }
  const degraded = health.llm_status !== "ok";
  const color = degraded ? "var(--lane-scam)" : "var(--color-ink)";
  const text = degraded ? "second signal unavailable" : "all engines ready";
  return (
    <span
      className="label inline-flex items-center gap-1.5"
      style={{ color }}
      title={`${health.version} · ${text}`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {degraded ? "degraded" : "ready"}
    </span>
  );
}

/** F11: banner shown whenever the second signal is down. */
export function DegradedBanner() {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink shadow-soft"
      role="status"
    >
      <AlertIcon size={13} />
      <span className="text-muted">Second opinion unavailable ·</span> stricter threshold in effect
    </div>
  );
}

"use client";
/** Health dot + degraded banner (docs/06 §4.2, F11): model state and second-
 * signal availability. Status always carries icon + text, not just color. */
import type { HealthResponse } from "@/lib/types";
import { AlertIcon, CheckIcon } from "./icons";

export function HealthDot({
  health,
  showText = false,
}: {
  health: HealthResponse | null;
  showText?: boolean;
}) {
  if (!health || !health.model_loaded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted" title="Warming up">
        <span className="h-2.5 w-2.5 animate-pulse  bg-muted" aria-hidden />
        warming up
      </span>
    );
  }
  const degraded = health.llm_status !== "ok";
  const color = degraded ? "#B45309" : "#15803D";
  const text = degraded ? "second signal unavailable" : "all engines ready";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold"
      style={{ color }}
      title={`${health.version} · ${text}`}
    >
      <span className="inline-flex h-2.5 w-2.5 items-center justify-center " style={{ background: color }} aria-hidden />
      {showText ? text : degraded ? "degraded" : "ready"}
    </span>
  );
}

/** F11: banner shown whenever the second signal is down. */
export function DegradedBanner() {
  return (
    <div
      className="flex items-center gap-2  border px-3 py-2 text-[13px] font-medium"
      style={{ borderColor: "#F59E0B", background: "rgba(245,158,11,0.10)", color: "#92400E" }}
      role="status"
    >
      <AlertIcon size={14} />
      Second opinion unavailable — using stricter threshold
    </div>
  );
}

export function AllReadyChip() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#15803D" }}>
      <CheckIcon size={11} /> engines ready
    </span>
  );
}

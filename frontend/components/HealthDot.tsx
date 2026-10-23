"use client";
/** Health dot + degraded banner (docs/06 §4.2, F11): model state and second-
 * signal availability. Status always carries icon + text, not just color. */
import type { HealthResponse } from "@/lib/types";
import { AlertIcon } from "./icons";

export function HealthDot({ health }: { health: HealthResponse | null }) {
  // The healthy state is the dot alone: the word "ready" sat in the bar and
  // said nothing a filled dot does not. A warning still carries its text
  // (docs/06 §7: colour is never the only signal).
  if (!health || !health.model_loaded) {
    return (
      <span className="label inline-flex items-center gap-1.5 text-muted" title="Warming up">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted" aria-hidden />
        warming up
      </span>
    );
  }
  const degraded = health.llm_status !== "ok";
  if (!degraded) {
    return (
      <span
        className="inline-flex items-center"
        // The engine that is really answering (docs/04 §2.1) — a deployment
        // running the backup must not look identical to one running Laya.
        title={`${health.version} · ${health.engine} · all engines ready`}
        aria-label={`All engines ready · ${health.engine}`}
        role="status"
      >
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-ink)" }} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="label inline-flex items-center gap-1.5"
      style={{ color: "var(--lane-scam)" }}
      title={`${health.version} · ${health.engine} · second signal unavailable`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--lane-scam)" }} aria-hidden />
      degraded
    </span>
  );
}

/** F11: banner shown whenever the second signal is down. */
export function DegradedBanner() {
  return (
    <div
      className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[12px] text-ink shadow-soft"
      role="status"
    >
      <AlertIcon size={13} />
      <span className="text-muted">Second opinion unavailable ·</span> stricter threshold in effect
    </div>
  );
}

"use client";
/** AI panel (docs/06 §4.2): class chip, confidence bar with the enforced
 * threshold tick, six-class probability bars, second opinion, route reason,
 * latency. Route recomputation uses the SAME route() as the backend. */
import { requiredThreshold, route, type RouteSignals } from "@/lib/route";
import type { Prediction } from "@/lib/types";
import { ClassChip } from "./ClassChip";
import { ConfidenceBar } from "./ConfidenceBar";
import { ProbBars } from "./ProbBars";
import { AlertIcon } from "./icons";

export function signalsOf(pred: Prediction): RouteSignals {
  return {
    top_class: pred.top_class,
    top_prob: pred.top_prob,
    scam_prob: pred.scam_prob,
    escalate_prob: pred.escalate_prob,
    llm_class: pred.llm_class,
    llm_status: pred.llm_status,
  };
}

export function AIPanel({
  pred,
  tau,
  degraded,
}: {
  pred: Prediction;
  tau: number;
  degraded: boolean;
}) {
  const [, reason] = route(signalsOf(pred), tau);
  const required = requiredThreshold(pred.top_class, tau, degraded);
  const isScam = pred.scam_prob >= 0.5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ClassChip classKey={pred.top_class} large />
        <span className="tnum text-sm text-muted">p {pred.top_prob.toFixed(2)}</span>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Confidence
        </div>
        <ConfidenceBar value={pred.top_prob} threshold={required} />
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Classes
        </div>
        <ProbBars probs={pred.class_probs} highlight={pred.top_class} />
      </div>

      <div className="rounded-xl border border-line bg-paper p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Second opinion
          </span>
          {pred.llm_status === "ok" ? (
            <span className="text-[11px] font-semibold" style={{ color: "#17A34A" }}>
              ✓ {pred.llm_class ?? "—"}
            </span>
          ) : (
            <span className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>
              ⚠ unavailable
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-snug text-muted">
          {pred.llm_reason ?? (pred.llm_status === "ok" ? "—" : "Stricter threshold in effect.")}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Why this lane
        </span>
        <p className="mt-1 text-[13px] font-medium leading-snug text-ink">{reason}</p>
        <p className="mt-2 text-[11px] text-muted">
          engine {pred.engine} · {pred.latency_ms} ms
        </p>
      </div>

      {isScam && (
        <div
          className="rounded-xl border-2 p-3 text-[13px]"
          style={{ borderColor: "#E5252A", background: "rgba(229,37,42,0.06)" }}
          role="alert"
        >
          <div className="flex items-center gap-1.5 font-bold" style={{ color: "#E5252A" }}>
            <AlertIcon size={13} /> Scam-like message
          </div>
          <p className="mt-1 text-ink">
            Do not send items or advance payments. This message is never auto-handled.
          </p>
        </div>
      )}
    </div>
  );
}

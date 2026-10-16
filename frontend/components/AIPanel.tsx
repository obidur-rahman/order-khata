"use client";
/** AI panel (docs/06 §4.2): class chip, confidence bar with the enforced
 * threshold tick, six-class probability bars, second opinion, route reason,
 * latency. Route recomputation uses the SAME route() as the backend. */
import { SCAM_T, requiredThreshold, route, type RouteSignals } from "@/lib/route";
import type { Prediction } from "@/lib/types";
import { ClassChip } from "./ClassChip";
import { ConfidenceBar } from "./ConfidenceBar";
import { ProbBars } from "./ProbBars";
import { AlertIcon, CheckIcon } from "./icons";

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-3">
      <div className="label mb-2 text-muted">{label}</div>
      {children}
    </div>
  );
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
  // Same gate the router uses (docs/04 §4 rule 1): SCAM_T, not a local guess —
  // the card says "never auto-handled", which is only true at the real threshold.
  const isScam = pred.scam_prob >= SCAM_T;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <ClassChip classKey={pred.top_class} large />
        <span className="tnum text-sm text-ink">p {pred.top_prob.toFixed(2)}</span>
      </div>

      <Field label="Confidence">
        <ConfidenceBar value={pred.top_prob} threshold={required} />
      </Field>

      <Field label="Class scores">
        <ProbBars probs={pred.class_probs} highlight={pred.top_class} />
      </Field>

      <Field label="Second opinion">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink">
            {pred.llm_class ?? "—"}
          </span>
          {pred.llm_status === "ok" ? (
            <span className="label inline-flex items-center gap-1 text-ink">
              <CheckIcon size={11} /> ok
            </span>
          ) : (
            <span
              className="label inline-flex items-center gap-1"
              style={{ color: "var(--lane-scam)" }}
            >
              <AlertIcon size={11} /> unavailable
            </span>
          )}
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-muted">
          {pred.llm_reason ??
            (pred.llm_status === "ok" ? "—" : "Stricter threshold in effect.")}
        </p>
      </Field>

      <Field label="Why this lane">
        <p className="text-[13px] font-medium leading-snug text-ink">{reason}</p>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          {pred.engine} · {pred.latency_ms} ms
        </p>
      </Field>

      {isScam && (
        <div
          className="rounded-xl border-2 p-3 text-[12.5px]"
          style={{ borderColor: "var(--lane-scam)", background: "var(--scam-tint)" }}
          role="alert"
        >
          <div
            className="label flex items-center gap-1.5"
            style={{ color: "var(--lane-scam)" }}
          >
            <AlertIcon size={12} /> Scam-like message
          </div>
          <p className="mt-1.5 text-ink">
            Do not send items or advance payments. This message is never auto-handled.
          </p>
        </div>
      )}
    </div>
  );
}

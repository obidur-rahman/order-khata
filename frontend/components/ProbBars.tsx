"use client";
/** Six-class probability bars (docs/06 §4.2). Editorial: mono labels,
 * hairline bars on the class ramp; the top class fills solid ink. */
import { CLASS_META } from "@/lib/brand";
import { CLASSES } from "@/lib/types";

export function ProbBars({
  probs,
  highlight,
}: {
  probs: Record<string, number>;
  highlight?: string;
}) {
  return (
    <div className="space-y-2" role="list" aria-label="Class probabilities">
      {CLASSES.map((key) => {
        const p = probs[key] ?? 0;
        const meta = CLASS_META[key];
        const top = key === highlight;
        return (
          <div key={key} className="flex items-center gap-2.5" role="listitem">
            <span
              className={`w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] ${
                top ? "text-ink" : "text-muted"
              }`}
            >
              {meta.label}
            </span>
            <div className="h-2 flex-1 rounded-full bg-line">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(1.5, p * 100)}%`,
                  background: meta.color,
                  opacity: top ? 1 : 0.35,
                }}
              />
            </div>
            <span className={`tnum w-8 shrink-0 text-right text-[11px] ${top ? "text-ink" : "text-muted"}`}>
              {(p * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

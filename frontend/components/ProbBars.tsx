"use client";
/** Six-class probability bars, quiet skin: soft rounded tracks, tint fills. */
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
              className={`w-16 shrink-0 text-[11.5px] ${top ? "font-medium text-ink" : "text-muted"}`}
            >
              {meta.label}
            </span>
            <div className="h-2 flex-1 rounded-full bg-line">
              <div
                className="h-2 rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.max(2, p * 100)}%`,
                  background: meta.color,
                  opacity: top ? 1 : 0.45,
                }}
              />
            </div>
            <span className={`index w-8 shrink-0 text-right text-[11px] ${top ? "text-ink" : "text-muted"}`}>
              {(p * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

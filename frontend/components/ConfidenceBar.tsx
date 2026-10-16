"use client";
/** Confidence bar with the threshold tick (docs/06 §4.2 AI panel).
 * A rounded pill track, ink fill; the accent tick is the value enforced. */
export function ConfidenceBar({
  value,
  threshold,
  showLabels = true,
}: {
  value: number;
  threshold: number;
  showLabels?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const tick = Math.max(0, Math.min(1, threshold)) * 100;
  const meets = value >= threshold;
  return (
    <div className="w-full">
      <div
        className="relative h-2.5 w-full rounded-full bg-line"
        role="img"
        aria-label={`Confidence ${Math.round(pct)} percent, threshold ${Math.round(tick)} percent`}
      >
        <div
          className="h-2.5 rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: meets ? "var(--color-ink)" : "var(--color-muted)" }}
        />
        {/* threshold tick: ink line + accent cap */}
        <div
          className="absolute top-[-4px] h-[18px] w-[2px] rounded-full bg-accent"
          style={{ left: `calc(${tick}% - 1px)` }}
          aria-hidden
        />
      </div>
      {showLabels && (
        <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          <span>confidence {value.toFixed(2)}</span>
          <span>needs ≥ {threshold.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

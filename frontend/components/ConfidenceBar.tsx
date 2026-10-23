"use client";
/** Confidence bar, quiet skin: soft pill track, the threshold tick is a
 * small floating knob-marker. */
export function ConfidenceBar({
  value,
  threshold,
}: {
  value: number;
  threshold: number;
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
        {/* threshold tick: a soft knob on the track */}
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full"
          style={{ left: `calc(${tick}% - 2px)`, background: "var(--mark)" }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-muted">
        <span>confidence {value.toFixed(2)}</span>
        <span>needs ≥ {threshold.toFixed(2)}</span>
      </div>
    </div>
  );
}

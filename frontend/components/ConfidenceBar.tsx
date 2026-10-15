"use client";
/** Confidence bar with the threshold tick (docs/06 §4.2 AI panel). */
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
      <div className="relative h-3 w-full  bg-line" role="img"
        aria-label={`Confidence ${Math.round(pct)} percent, threshold ${Math.round(tick)} percent`}>
        <div
          className="h-3  transition-[width] duration-300"
          style={{ width: `${pct}%`, background: meets ? "#17A34A" : "#F59E0B" }}
        />
        {/* threshold tick: ink line + brand halo so it reads on any fill */}
        <div
          className="absolute top-[-3px] h-[18px] w-[3px]  bg-ink"
          style={{ left: `calc(${tick}% - 1.5px)`, boxShadow: "0 0 0 1.5px #FFD60A" }}
          aria-hidden
        />
      </div>
      {showLabels && (
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>confidence {value.toFixed(2)}</span>
          <span>needs ≥ {threshold.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

"use client";
/** Threshold slider (docs/06 §4.2): label, value, live counters. Changes are
 * handled client-side — lanes recompute instantly via lib/route (no network). */
import type { Lane } from "@/lib/types";

export function ThresholdSlider({
  value,
  min,
  max,
  counts,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  counts: Record<Lane, number>;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="tau" className="text-xs font-semibold text-muted whitespace-nowrap">
        Confidence threshold
      </label>
      <input
        id="tau"
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-36 cursor-pointer appearance-none rounded-full bg-line accent-ink sm:w-44"
        aria-valuetext={`${value.toFixed(2)}`}
      />
      <span className="tnum w-9 text-sm text-ink">{value.toFixed(2)}</span>
      <span className="hidden items-center gap-2 text-xs font-medium md:flex" aria-live="polite">
        <span style={{ color: "#17A34A" }}>{counts.auto} Auto</span>
        <span className="text-line">·</span>
        <span style={{ color: "#F59E0B" }}>{counts.review} Review</span>
        <span className="text-line">·</span>
        <span style={{ color: "#E5252A" }}>{counts.scam} Scam</span>
      </span>
    </div>
  );
}

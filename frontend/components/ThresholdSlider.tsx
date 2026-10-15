"use client";
/** Threshold slider (docs/06 §4.2): label, value, live counters. Changes are
 * handled client-side — lanes recompute instantly via lib/route (no network). */
import { LANE_META } from "@/lib/brand";
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
        className="tau w-36 sm:w-44"
        aria-valuetext={`${value.toFixed(2)}`}
      />
      <span className="tnum w-9 text-sm text-ink">{value.toFixed(2)}</span>
      <span className="hidden items-center gap-2 text-xs font-medium md:flex" aria-live="polite">
        <span style={{ color: LANE_META.auto.deep }}>{counts.auto} Auto</span>
        <span className="text-line">·</span>
        <span style={{ color: LANE_META.review.deep }}>{counts.review} Review</span>
        <span className="text-line">·</span>
        <span style={{ color: LANE_META.scam.deep }}>{counts.scam} Scam</span>
      </span>
    </div>
  );
}

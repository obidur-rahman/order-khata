"use client";
/** Threshold slider, quiet skin: label, value, live counters. Changes are
 * handled client-side — lanes recompute instantly via lib/route (no network). */
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
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
  /** Live lane counters. Omitted where they mean nothing (Try It). */
  counts?: Record<Lane, number>;
  onChange: (v: number) => void;
}) {
  const { t } = usePrefs();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="tau" className="label whitespace-nowrap text-muted">
        {t("dial.threshold")}
      </label>
      <input
        id="tau"
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="tau w-32 sm:w-40"
        aria-valuetext={`${value.toFixed(2)}`}
      />
      <span className="tnum w-9 text-sm text-ink">{value.toFixed(2)}</span>
      {counts && (
        <span className="hidden items-center gap-2 text-[11.5px] md:flex" aria-live="polite">
          <span style={{ color: LANE_META.auto.deep }}>
            {counts.auto} {t("lane.auto.short")}
          </span>
          <span className="text-line">/</span>
          <span style={{ color: LANE_META.review.deep }}>
            {counts.review} {t("lane.review.short")}
          </span>
          <span className="text-line">/</span>
          <span style={{ color: LANE_META.scam.deep }}>
            {counts.scam} {t("lane.scam.short")}
          </span>
        </span>
      )}
    </div>
  );
}

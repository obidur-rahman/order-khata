"use client";
/** Resolve banner, quiet skin: a soft tinted card, no hard edge. Carries the
 * route reason and the Confirm / Change-to actions (F6). The parent applies
 * the change optimistically. */
import { CLASS_META } from "@/lib/brand";
import { CLASSES, type ClassKey, type Prediction } from "@/lib/types";
import { CheckIcon, EyeIcon } from "./icons";

export function ResolveBar({
  pred,
  lane,
  onConfirm,
  onChange,
  busy,
  resolvedLabel,
}: {
  pred: Prediction;
  lane: "auto" | "review" | "scam";
  onConfirm: (label: ClassKey) => void;
  onChange: (label: ClassKey) => void;
  busy: boolean;
  resolvedLabel?: string | null;
}) {
  if (lane !== "review") return null;

  return (
    <div
      className="rounded-[24px] px-5 py-4"
      style={{
        background: "color-mix(in oklab, var(--lane-review) 10%, var(--surface))",
      }}
      aria-label="Needs your eyes"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex" style={{ color: "var(--lane-review-deep)" }}>
          <EyeIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label" style={{ color: "var(--lane-review-deep)" }}>
            Needs your eyes
          </p>
          <p className="mt-1 text-[13px] leading-snug text-ink">{pred.route_reason}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={busy}
              onClick={() => onConfirm(pred.top_class)}
              className="rounded-full bg-btn px-4 py-1.5 text-[12px] font-medium text-btn-ink transition hover:opacity-85 disabled:opacity-50"
            >
              Confirm “{CLASS_META[pred.top_class].label}”
            </button>
            <label className="flex items-center gap-1.5 text-[12px] text-muted">
              Change to
              <select
                className="rounded-full border border-line-strong bg-surface px-3 py-1 text-[12px] text-ink"
                value=""
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value) onChange(e.target.value as ClassKey);
                }}
              >
                <option value="" disabled>
                  pick label
                </option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {CLASS_META[c].label}
                  </option>
                ))}
              </select>
            </label>
            {resolvedLabel && (
              <span className="label inline-flex items-center gap-1 text-ink">
                <CheckIcon size={11} /> resolved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

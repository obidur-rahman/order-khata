"use client";
/** Resolve bar (docs/06 §4.2): sticky banner on review items with the route
 * reason and Confirm / Change-to actions (F6). Parent applies optimistically. */
import { CLASS_META } from "@/lib/brand";
import { CLASSES, type ClassKey, type Prediction } from "@/lib/types";
import { EyeIcon } from "./icons";

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
      className="sticky bottom-3 z-10 rounded-2xl border-2 bg-surface p-3 shadow-[0_6px_24px_rgba(15,15,15,0.10)]"
      style={{ borderColor: "#F59E0B" }}
      aria-label="Needs your eyes"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex" style={{ color: "#B45309" }}>
          <EyeIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{pred.route_reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              disabled={busy}
              onClick={() => onConfirm(pred.top_class)}
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper transition hover:opacity-85 disabled:opacity-50"
            >
              Confirm “{CLASS_META[pred.top_class].label}”
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Change to…
              <select
                className="rounded-full border border-line bg-paper px-2 py-1 text-xs font-semibold text-ink"
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
              <span className="text-[11px] font-semibold" style={{ color: "#17A34A" }}>
                ✓ resolved as {resolvedLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

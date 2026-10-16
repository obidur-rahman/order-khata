"use client";
/** Resolve banner (docs/06 §4.2): the accent-bordered call-out on review
 * items, carrying the route reason and the Confirm / Change-to actions (F6).
 * The parent applies the change optimistically.
 *
 * It is a wash, not a floating card: it sits on the thread's own control bar,
 * so a lift shadow would only fight that bar's surface. */
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
    <div className="rounded-2xl border border-accent bg-accent-tint p-3.5" aria-label="Needs your eyes">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex text-accent">
          <EyeIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label text-accent">Needs your eyes</p>
          <p className="mt-1 text-[13px] font-medium text-ink">{pred.route_reason}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              disabled={busy}
              onClick={() => onConfirm(pred.top_class)}
              className="rounded-full bg-ink px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-paper shadow-soft transition hover:bg-accent-deep disabled:opacity-50"
            >
              Confirm “{CLASS_META[pred.top_class].label}”
            </button>
            <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Change to
              <select
                className="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[11px] text-ink"
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
                <CheckIcon size={11} /> resolved {resolvedLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
/** Stat card (docs/06 §4.4): big tabular number, mono label, optional hint.
 * A soft card rather than a ruled one — the number is loud enough already. */
export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="label text-muted">{label}</div>
      <div className="tnum mt-3 text-[44px] leading-none" style={{ color: accent ?? "var(--color-ink)" }}>
        {value}
      </div>
      {hint && <div className="mt-2.5 text-[12px] leading-snug text-muted">{hint}</div>}
    </div>
  );
}

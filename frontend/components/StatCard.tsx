"use client";
/** Stat card (docs/06 §4.4): big tabular number, plain label, optional hint. */
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
    <div className=" border border-line bg-surface p-5">
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div className="tnum mt-2 text-[44px] leading-none" style={{ color: accent ?? "#0F0F0F" }}>
        {value}
      </div>
      {hint && <div className="mt-2 text-[12px] leading-snug text-muted">{hint}</div>}
    </div>
  );
}

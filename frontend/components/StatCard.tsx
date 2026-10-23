"use client";
/** Stat, quiet skin: a big number on air, small caption. No rules. */
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
    <div className="h-full">
      <div className="label text-muted">{label}</div>
      <div
        className="tnum mt-3 text-[46px]"
        style={{ color: accent ?? "var(--color-ink)" }}
      >
        {value}
      </div>
      {hint && <div className="mt-2.5 text-[12px] leading-snug text-muted">{hint}</div>}
    </div>
  );
}

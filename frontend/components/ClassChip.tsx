"use client";
/** docs/06 §2 chips: a capsule with a mono label and a small round swatch.
 * Colour never carries meaning alone — the label always does. */
import { classMeta } from "@/lib/brand";

export function ClassChip({
  classKey,
  large = false,
}: {
  classKey: string;
  large?: boolean;
}) {
  const meta = classMeta(classKey);
  return (
    <span
      className={`inline-flex items-center rounded-full whitespace-nowrap border font-mono uppercase ${
        large ? "gap-2 px-2.5 py-1 text-[12px] tracking-[0.08em]" : "gap-1.5 px-2 py-0.5 text-[10px] tracking-[0.08em]"
      }`}
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-surface)",
        color: "var(--color-ink)",
      }}
    >
      <span
        className={large ? "h-2 w-2 rounded-full" : "h-1.5 w-1.5 rounded-full"}
        style={{ background: meta.color }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

"use client";
/** Class chip, quiet skin: a soft tinted pill. Colour never carries meaning
 * alone — the label always does. */
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
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${
        large ? "gap-2 px-3 py-1 text-[12.5px]" : "gap-1.5 px-2.5 py-0.5 text-[11.5px]"
      }`}
      style={{
        background: "color-mix(in oklab, var(--color-line) 80%, transparent)",
        color: "var(--color-ink)",
      }}
    >
      <span
        className={large ? "h-1.5 w-1.5 rounded-full" : "h-1 w-1 rounded-full"}
        style={{ background: meta.color }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

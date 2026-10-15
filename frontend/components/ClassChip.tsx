"use client";
/** docs/06 §2 chips: 12% tint background, full-color (darkened for >=4.5:1
 * contrast) text, label always present — color never carries meaning alone. */
import { classMeta, tint } from "@/lib/brand";

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
      className={`inline-flex items-center gap-1.5  font-semibold whitespace-nowrap ${
        large ? "px-3 py-1 text-[15px]" : "px-2 py-0.5 text-xs"
      }`}
      style={{
        background: tint(meta.color),
        color: `color-mix(in srgb, ${meta.color} 72%, black)`,
      }}
    >
      <span
        className={large ? "h-2 w-2 " : "h-1.5 w-1.5 "}
        style={{ background: meta.color }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

"use client";
/** Designed empty state (docs/06 §6: never blank). A soft quiet card in the
 * middle of air, not a ruled page. */
import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-surface2 text-muted"
        aria-hidden
      >
        {icon ?? "◎"}
      </span>
      <p className="display text-[22px] text-ink">{title}</p>
      {hint && <p className="max-w-xs text-[13px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

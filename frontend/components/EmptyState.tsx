"use client";
/** Designed empty state (docs/06 §6: never blank). */
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
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/40 text-ink" aria-hidden>
        {icon ?? "◎"}
      </span>
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm leading-snug text-muted">{hint}</p>}
    </div>
  );
}

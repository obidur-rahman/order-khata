"use client";
/** Lane badge (docs/06 §2, §7): always icon + text + colour, so the lane is
 * legible without relying on hue. Used on landing, Try It and dashboard. */
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import type { Lane } from "@/lib/types";
import { AlertIcon, CheckIcon, EyeIcon } from "./icons";

export function LaneIcon({ icon, size = 13 }: { icon: "check" | "eye" | "shield"; size?: number }) {
  if (icon === "check") return <CheckIcon size={size} />;
  if (icon === "eye") return <EyeIcon size={size} />;
  return <AlertIcon size={size} />;
}

export function LaneChip({
  lane,
  filled = false,
}: {
  lane: Lane;
  filled?: boolean;
}) {
  const { t } = usePrefs();
  const m = LANE_META[lane];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]"
      style={
        filled
          ? { background: m.color, borderColor: m.color, color: "var(--paper)" }
          : { background: "var(--color-surface)", borderColor: "var(--color-line)", color: m.deep }
      }
    >
      <LaneIcon icon={m.icon} size={11} />
      {t(`lane.${lane}`)}
    </span>
  );
}

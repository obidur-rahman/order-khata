"use client";
/** Lane badge, quiet skin: always icon + text + colour, so the lane is
 * legible without relying on hue. A soft tinted pill; the filled variant is
 * a solid pill. */
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
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium"
      style={
        filled
          ? { background: m.color, color: "var(--paper)" }
          : {
              background: "color-mix(in oklab, currentColor 10%, transparent)",
              color: m.deep,
            }
      }
    >
      <LaneIcon icon={m.icon} size={11} />
      {t(`lane.${lane}`)}
    </span>
  );
}

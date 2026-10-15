"use client";
/** Lane tabs with counts (docs/06 §4.2): icon + text + color, keyboard navigable. */
import { LANE_META } from "@/lib/brand";
import type { Lane } from "@/lib/types";
import { AlertIcon, CheckIcon, EyeIcon, InboxIcon } from "./icons";

export type LaneTab = "all" | Lane;

const TABS: { key: LaneTab; label: string; color?: string }[] = [
  { key: "all", label: "All" },
  { key: "auto", label: LANE_META.auto.label, color: LANE_META.auto.deep },
  { key: "review", label: LANE_META.review.label, color: LANE_META.review.deep },
  { key: "scam", label: LANE_META.scam.label, color: LANE_META.scam.deep },
];

function TabIcon({ tab }: { tab: LaneTab }) {
  if (tab === "auto") return <CheckIcon />;
  if (tab === "review") return <EyeIcon />;
  if (tab === "scam") return <ShieldTab />;
  return <InboxIcon size={14} />;
}
function ShieldTab() {
  return <AlertIcon />;
}

export function LaneTabs({
  active,
  counts,
  onSelect,
}: {
  active: LaneTab;
  counts: Record<LaneTab, number>;
  onSelect: (tab: LaneTab) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Lanes">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(t.key)}
            className={`flex min-h-11 items-center gap-1.5  px-3.5 text-[13px] font-semibold whitespace-nowrap transition ${
              isActive ? "bg-ink text-paper" : "bg-surface text-muted hover:text-ink"
            }`}
            style={isActive && t.color ? { background: t.color, color: "#fff" } : undefined}
          >
            <span style={t.color && !isActive ? { color: t.color } : undefined} className="inline-flex">
              <TabIcon tab={t.key} />
            </span>
            {t.label}
            <span
              className={`tnum  px-1.5 text-[11px] ${
                isActive ? "bg-black/20 text-white" : "bg-line text-muted"
              }`}
            >
              {counts[t.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

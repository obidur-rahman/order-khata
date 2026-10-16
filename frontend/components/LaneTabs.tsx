"use client";
/** Lane tabs with counts (docs/06 §4.2): icon + text + color, keyboard
 * navigable. */
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import type { Lane } from "@/lib/types";
import { AlertIcon, CheckIcon, EyeIcon, InboxIcon } from "./icons";

export type LaneTab = "all" | Lane;

const TABS: { key: LaneTab; color?: string }[] = [
  { key: "all", color: undefined },
  { key: "auto", color: LANE_META.auto.deep },
  { key: "review", color: LANE_META.review.deep },
  { key: "scam", color: LANE_META.scam.deep },
];

function TabIcon({ tab }: { tab: LaneTab }) {
  if (tab === "auto") return <CheckIcon />;
  if (tab === "review") return <EyeIcon />;
  if (tab === "scam") return <AlertIcon />;
  return <InboxIcon size={14} />;
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
  const { t } = usePrefs();
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Lanes">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={`flex min-h-11 items-center gap-2 rounded-full px-3.5 font-mono text-[11px] uppercase tracking-[0.08em] whitespace-nowrap transition ${
              isActive
                ? "bg-ink text-paper shadow-soft"
                : "text-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <span
              style={!isActive && tab.color ? { color: tab.color } : undefined}
              className="inline-flex"
            >
              <TabIcon tab={tab.key} />
            </span>
            {t(`lane.${tab.key}`)}
            <span
              className={`index rounded-full border px-1.5 py-0.5 text-[10px] ${
                isActive ? "border-paper/30 text-paper" : "border-line text-muted"
              }`}
            >
              {counts[tab.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

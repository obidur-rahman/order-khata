"use client";
/** Lane tabs with counts (docs/06 §4.2): icon + text + color, keyboard
 * navigable.
 *
 * Two shapes of the same control, because the lane filter is the only
 * navigation in the app and it has to sit where the screen can afford it:
 *
 *   `tabs` (default)  a wrapped row of pills — above the list from md up
 *   `bar`             four equal cells for the phone's bottom bar: the short
 *                     lane name, the count and the lane icon, with the lane
 *                     colour carried by the icon (never by colour alone).
 *
 * Both render the same TABS list, counters and i18n keys, so the two can
 * never drift apart.
 */
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

/** Long name in the row, short name in the bar (the i18n keys already exist
 *  for both — the slider has always used `lane.*.short`). */
const LONG_KEY = (tab: LaneTab) => `lane.${tab}`;
const SHORT_KEY: Record<LaneTab, string> = {
  all: "lane.all",
  auto: "lane.auto.short",
  review: "lane.review.short",
  scam: "lane.scam.short",
};

function TabIcon({ tab, size }: { tab: LaneTab; size?: number }) {
  if (tab === "auto") return <CheckIcon size={size} />;
  if (tab === "review") return <EyeIcon size={size} />;
  if (tab === "scam") return <AlertIcon size={size} />;
  return <InboxIcon size={size ?? 14} />;
}

export function LaneTabs({
  active,
  counts,
  onSelect,
  variant = "tabs",
}: {
  active: LaneTab;
  counts: Record<LaneTab, number>;
  onSelect: (tab: LaneTab) => void;
  /** `bar` = full-width bottom bar cells (phones), `tabs` = pill row. */
  variant?: "tabs" | "bar";
}) {
  const { t } = usePrefs();

  if (variant === "bar") {
    return (
      <div role="tablist" aria-label={t("nav.lanes")} className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-label={`${t(LONG_KEY(tab.key))} · ${count}`}
              onClick={() => onSelect(tab.key)}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 ${
                isActive ? "text-accent-deep" : "text-muted"
              }`}
              style={isActive ? { background: "var(--accent-tint)" } : undefined}
            >
              {/* the selected cell also carries a lane-coloured rule, so the
                  state survives without relying on the tint alone */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-4 top-0 h-0.5 rounded-full"
                  style={{ background: tab.color ?? "var(--accent)" }}
                />
              )}
              <span
                className="inline-flex items-center gap-1.5"
                style={!isActive && tab.color ? { color: tab.color } : undefined}
              >
                <TabIcon tab={tab.key} />
                <span className="index text-[10px]">{count}</span>
              </span>
              <span className="label text-[9.5px] leading-none">{t(SHORT_KEY[tab.key])}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("nav.lanes")}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={`flex min-h-11 items-center gap-2 rounded-full px-3.5 font-mono text-[11px] uppercase tracking-[0.08em] whitespace-nowrap transition ${
              isActive ? "bg-ink text-paper shadow-soft" : "text-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <span
              style={!isActive && tab.color ? { color: tab.color } : undefined}
              className="inline-flex"
            >
              <TabIcon tab={tab.key} />
            </span>
            {t(LONG_KEY(tab.key))}
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

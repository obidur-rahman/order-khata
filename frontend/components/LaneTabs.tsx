"use client";
/** Lane tabs, quiet skin: a soft pill switch. Active = floating ink pill;
 * inactive = quiet text with a soft wash on hover. Both variants (`tabs` for
 * the strip, `bar` for the phone's bottom) share one TABS list, counters and
 * i18n keys, so they can never drift apart. */
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
  /** `bar` = full-width bottom bar cells (phones), `tabs` = pill strip. */
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
                isActive ? "text-ink" : "text-muted"
              }`}
              style={isActive ? { background: "var(--accent-tint)" } : undefined}
            >
              <span
                className="inline-flex items-center gap-1.5"
                style={!isActive && tab.color ? { color: tab.color } : undefined}
              >
                <TabIcon tab={tab.key} />
                <span className="index text-[10px]">{count}</span>
              </span>
              <span className="label text-[10px] leading-none">{t(SHORT_KEY[tab.key])}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="seg flex-wrap"
      role="tablist"
      aria-label={t("nav.lanes")}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={`flex min-h-8 items-center gap-2 whitespace-nowrap ${
              isActive ? "" : ""
            }`}
          >
            <span
              style={!isActive && tab.color ? { color: tab.color } : undefined}
              className="inline-flex"
            >
              <TabIcon tab={tab.key} size={12} />
            </span>
            {t(LONG_KEY(tab.key))}
            <span className={`index text-[10px] ${isActive ? "opacity-70" : "text-muted"}`}>
              {counts[tab.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

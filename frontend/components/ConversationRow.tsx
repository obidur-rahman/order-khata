"use client";
/** Conversation list row, quiet skin: borderless, soft. The active row is a
 * floating soft card; scam rows carry a red dot + shield. Messenger-compact,
 * editorial-quiet. */
import { classMeta, fmtTime, LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import type { ConversationRecord, MessageRecord } from "@/lib/types";
import { ClassChip } from "./ClassChip";
import { CheckIcon, EyeIcon, ShieldIcon } from "./icons";

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value)) * c;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-line)" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

export function ConversationRow({
  conv,
  msg,
  lane,
  active,
  isNew,
  onSelect,
}: {
  conv: ConversationRecord;
  msg: MessageRecord;
  lane: "auto" | "review" | "scam";
  active: boolean;
  isNew: boolean;
  onSelect: () => void;
}) {
  const { t } = usePrefs();
  const pred = msg.prediction;
  const meta = classMeta(pred.top_class);
  const initial = (conv.customer_name || "?").trim().charAt(0).toUpperCase();
  const unseen = isNew && !msg.resolution;
  return (
    <button
      onClick={onSelect}
      className={`mx-1.5 flex w-[calc(100%-0.75rem)] items-start gap-3 rounded-[20px] px-3.5 py-3 text-left transition-all duration-200 ${
        active ? "bg-surface shadow-lift" : "hover:bg-surface2/70"
      } ${isNew ? "msg-new" : ""}`}
      aria-current={active}
    >
      {/* avatar: soft tile with customer initial */}
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 font-mono text-sm font-medium text-ink"
        aria-hidden
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        {/* name + time row */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13.5px] font-medium text-ink">{conv.customer_name}</span>
          <span className="index shrink-0 text-[10.5px] text-muted">{fmtTime(msg.received_at)}</span>
        </div>
        {/* preview text */}
        <p className="mt-0.5 truncate text-[13px] text-muted">{msg.text}</p>
        {/* chip row: class + lane badge + state. Wraps rather than clipping. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ClassChip classKey={pred.top_class} />
          {lane === "review" && (
            <span
              className="label inline-flex items-center gap-1"
              style={{ color: "var(--lane-review-deep)" }}
            >
              <EyeIcon size={10} /> {t("inbox.needsYou")}
            </span>
          )}
          {lane === "scam" && (
            <span
              className="label inline-flex items-center gap-1"
              style={{ color: LANE_META.scam.deep }}
            >
              <ShieldIcon size={10} /> shielded
            </span>
          )}
          {msg.resolution && (
            <span className="label inline-flex items-center gap-1 text-muted">
              <CheckIcon size={10} /> resolved
            </span>
          )}
          {unseen && (
            <span className="label inline-flex items-center gap-1 text-accent">
              new
            </span>
          )}
        </div>
      </span>
      {/* confidence ring: the class and its certainty at a glance */}
      <span className="shrink-0" aria-hidden>
        <ConfidenceRing value={pred.top_prob} color={meta.color} />
      </span>
    </button>
  );
}

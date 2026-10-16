"use client";
/** Conversation list row (docs/06 §4.2): avatar, name, preview, time, class
 * chip, tiny confidence ring. Scam rows carry a red left rule + shield.
 * Messenger-like: compact row with avatar tile, name+time on one line,
 * preview text, class chip. Editorial styling: hairline separators, mono
 * metadata, ink avatars. */
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
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-line)" strokeWidth="2" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
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
  const borderLeft =
    lane === "scam"
      ? "3px solid var(--lane-scam)"
      : active
        ? "3px solid var(--color-accent)"
        : "3px solid transparent";
  const unseen = isNew && !msg.resolution;
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-start gap-3 border-b border-line px-3 py-2.5 text-left transition-colors ${
        active ? "bg-accent-tint" : "hover:bg-surface"
      } ${isNew ? "msg-new" : ""}`}
      style={{ background: active ? "var(--accent-tint)" : undefined, borderLeft }}
      aria-current={active}
    >
      {/* avatar: rounded ink tile with customer initial */}
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-sm font-medium text-paper shadow-soft"
        aria-hidden
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        {/* name + time row */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{conv.customer_name}</span>
          <span className="index shrink-0 text-[10px] text-muted">{fmtTime(msg.received_at)}</span>
        </div>
        {/* preview text */}
        <p className="mt-0.5 truncate text-[13px] text-muted">{msg.text}</p>
        {/* chip row: class + lane badge + state. Wraps rather than clipping
            when the pane is narrow (two badges plus a chip exceed 320px). */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ClassChip classKey={pred.top_class} />
          {lane === "review" && (
            <span className="label inline-flex items-center gap-1 text-accent">
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

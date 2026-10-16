"use client";
/** Conversation list row (docs/06 §4.2): avatar, name, preview, time, class
 * chip, tiny confidence ring. Scam rows carry a red left rule + shield.
 * Editorial styling: hairline separators, mono metadata, ink avatars. */
import { classMeta, fmtTime, LANE_META } from "@/lib/brand";
import type { ConversationRecord, MessageRecord } from "@/lib/types";
import { ClassChip } from "./ClassChip";
import { CheckIcon, ShieldIcon } from "./icons";

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value)) * c;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="shrink-0">
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
  const pred = msg.prediction;
  const meta = classMeta(pred.top_class);
  const initial = (conv.customer_name || "?").trim().charAt(0).toUpperCase();
  const borderLeft =
    lane === "scam"
      ? "3px solid var(--lane-scam)"
      : active
        ? "3px solid var(--color-accent)"
        : "3px solid transparent";
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-start gap-3 border-b border-line px-3 py-3 text-left transition ${
        active ? "bg-accent-tint" : "bg-surface hover:bg-paper"
      } ${isNew ? "msg-new" : ""}`}
      style={{ borderLeft }}
      aria-current={active}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-sm font-medium text-paper"
        aria-hidden
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{conv.customer_name}</span>
          <span className="index shrink-0 text-[10px] text-muted">{fmtTime(msg.received_at)}</span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{msg.text}</span>
        <span className="mt-2 flex items-center gap-2">
          <ClassChip classKey={pred.top_class} />
          {lane === "scam" && (
            <span
              className="label inline-flex items-center gap-1"
              style={{ color: LANE_META.scam.deep }}
            >
              <ShieldIcon size={11} /> shielded
            </span>
          )}
          {msg.resolution && (
            <span className="label inline-flex items-center gap-1 text-muted">
              <CheckIcon size={11} /> resolved
            </span>
          )}
        </span>
      </span>
      <span className="mt-1 shrink-0">
        <ConfidenceRing value={pred.top_prob} color={meta.color} />
      </span>
    </button>
  );
}

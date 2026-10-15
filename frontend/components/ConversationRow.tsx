"use client";
/** Conversation list row (docs/06 §4.2): avatar, name, preview, time, class
 * chip, tiny confidence ring. Scam rows carry a red left border + shield. */
import { classMeta, fmtTime, LANE_META } from "@/lib/brand";
import type { ConversationRecord, MessageRecord } from "@/lib/types";
import { ClassChip } from "./ClassChip";
import { CheckIcon, ShieldIcon } from "./icons";

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value)) * c;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" stroke="#E8E2D4" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
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
  const pred = msg.prediction;
  const meta = classMeta(pred.top_class);
  const initial = (conv.customer_name || "?").trim().charAt(0).toUpperCase();
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-start gap-3 border-b border-line px-3 py-3 text-left transition ${
        active ? "bg-brand/25" : "bg-surface hover:bg-paper"
      } ${isNew ? "msg-new" : ""}`}
      style={lane === "scam" ? { borderLeft: "4px solid #E5252A" } : { borderLeft: "4px solid transparent" }}
      aria-current={active}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center  text-sm font-bold text-white"
        style={{ background: conv.avatar_color || "#2F6BFF" }}
        aria-hidden
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{conv.customer_name}</span>
          <span className="tnum shrink-0 text-[11px] text-muted">{fmtTime(msg.received_at)}</span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{msg.text}</span>
        <span className="mt-1.5 flex items-center gap-2">
          <ClassChip classKey={pred.top_class} />
          {lane === "scam" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: LANE_META.scam.deep }}>
              <ShieldIcon size={12} /> shielded
            </span>
          )}
          {msg.resolution && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
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

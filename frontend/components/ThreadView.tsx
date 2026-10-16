"use client";
/** Thread view (docs/06 §4.2): messenger-like chat bubbles, original script
 * preserved, sticky header with back nav on mobile, inline AI detail panel,
 * sticky resolve banner on review items, red warning card on scam items.
 *
 * Layout: header (sticky) → scam warning (if any) → messages (scrollable)
 * → inline AI + resolve panel (collapsible on mobile, always visible desktop).
 */
import { useState } from "react";

import { fmtClock } from "@/lib/brand";
import { route } from "@/lib/route";
import type { ClassKey, ConversationRecord, Lane, MessageRecord } from "@/lib/types";
import { AIPanel, signalsOf } from "./AIPanel";
import { ClassChip } from "./ClassChip";
import { MessageBubble } from "./MessageBubble";
import { ResolveBar } from "./ResolveBar";
import { AlertIcon, ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "./icons";
import { usePrefs } from "@/lib/prefs";

export function ThreadView({
  conv,
  tau,
  degraded,
  isNewId,
  busyId,
  resolveError,
  onResolve,
  onBack,
}: {
  conv: ConversationRecord;
  tau: number;
  degraded: boolean;
  isNewId: string | null;
  busyId: string | null;
  resolveError: string | null;
  onResolve: (messageId: string, label: ClassKey) => void;
  /** Back nav: return to conversation list. */
  onBack?: () => void;
}) {
  const { t } = usePrefs();
  const msgs = conv.messages.filter(Boolean);
  const latest = msgs[msgs.length - 1] ?? conv.last_message;
  if (!latest) return null;
  const pred = latest.prediction;
  const lane: Lane = route(signalsOf(pred), tau)[0];

  const [aiOpen, setAiOpen] = useState(true);
  const showAi = aiOpen && (lane === "review" || lane === "scam" || degraded);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── sticky thread header (messenger-style) ── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface/95 backdrop-blur-sm px-4 py-3">
        {/* back button: only on mobile (when list is a separate view) */}        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-full p-1 text-muted transition hover:bg-paper hover:text-ink"
            aria-label={t("inbox.backToInbox")}
          >
            <ArrowLeftIcon size={18} />
          </button>
        )}

        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-sm font-medium text-paper shadow-soft"
          aria-hidden
        >
          {conv.customer_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{conv.customer_name}</p>
          <p className="index text-[10px] text-muted">{fmtClock(conv.created_at)}</p>
        </div>
        <span className="ml-auto flex items-center gap-2">
          <ClassChip classKey={pred.top_class} />
          {lane === "scam" && (
            <span
              className="label inline-flex items-center gap-1"
              style={{ color: "var(--lane-scam)" }}
            >
              <AlertIcon size={11} /> scam
            </span>
          )}
        </span>
      </div>

      {/* ── scam warning card (docs/06 §4.2) ── */}
      {lane === "scam" && (
        <div
          className="mx-4 mt-3 rounded-xl border-2 p-3"
          style={{ borderColor: "var(--lane-scam)", background: "var(--scam-tint)" }}
          role="alert"
        >
          <p
            className="label flex items-center gap-1.5"
            style={{ color: "var(--lane-scam)" }}
          >
            <AlertIcon size={13} /> {t("inbox.scamWarning")}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            scam probability {pred.scam_prob.toFixed(2)} · never auto-handled
          </p>
        </div>
      )}

      {/* ── messages: messenger-like chat area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {/* spacer so messages don't hide under sticky header */}
        <div className="h-8" aria-hidden />
        <div className="flex flex-col gap-3">
          {msgs.map((m: MessageRecord) => (
            <MessageBubble key={m.id} msg={m} isNew={m.id === isNewId} />
          ))}
        </div>
        {msgs.length > 1 && (
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {t("inbox.olderMessages")} · {pred.engine}
          </p>
        )}
      </div>

      {/* ── inline AI + resolve panel (collapsible on mobile, always open desktop) ── */}
      <div className="border-t border-line bg-surface px-4 py-3">
        {/* mobile: collapse toggle. desktop: always show. */}
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          className="flex items-center justify-between gap-2 border-b border-line pb-2 lg:hidden"
        >
          <span className="label text-muted">{t("inbox.messageDetails")}</span>
          {aiOpen ? (
            <ChevronUpIcon size={14} className="text-muted" aria-hidden />
          ) : (
            <ChevronDownIcon size={14} className="text-muted" aria-hidden />
          )}
        </button>

        {aiOpen && (
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_280px]">
            {/* resolve bar — full width on mobile, left column on desktop */}
            <div>
              <ResolveBar
                pred={pred}
                lane={lane}
                busy={busyId === latest.id}
                resolvedLabel={latest.resolution?.human_label ?? null}
                onConfirm={(label) => onResolve(latest.id, label)}
                onChange={(label) => onResolve(latest.id, label)}
              />
              {resolveError && (
                <p className="mt-2 text-[12px]" style={{ color: "var(--lane-scam)" }}>
                  {resolveError}
                </p>
              )}
            </div>

            {/* AI panel — full width on mobile (below resolve), right column on desktop */}
            <div className="lg:border-l lg:border-line lg:pl-4">
              <AIPanel pred={pred} tau={tau} degraded={degraded} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

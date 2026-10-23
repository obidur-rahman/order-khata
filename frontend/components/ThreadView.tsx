"use client";
/** Thread view (docs/06 §4.2): messenger-like chat bubbles, original script
 * preserved, header with back nav on phones, inline AI detail panel, resolve
 * banner on review items, red warning card on scam items.
 *
 * Layout: header → scam warning (if any) → messages (the pane's own scroll
 * area) → resolve + AI deck. The header is not sticky: it is a sibling of the
 * scroll area, so it already never moves, and `sticky` here only reserved the
 * 32px spacer that used to sit above the first bubble.
 *
 * `rail` says the page is rendering the AI detail panel in its own column at
 * xl+; the inline copy is hidden exactly there, so the panel exists once on
 * screen at every width.
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

/** Messages, warning card and the control deck share one measured column, so
 *  a 1920px window does not stretch a chat line across the screen. */
const COLUMN = "mx-auto w-full max-w-[46rem]";

export function ThreadView({
  conv,
  tau,
  degraded,
  isNewId,
  busyId,
  resolveError,
  onResolve,
  onBack,
  rail = false,
}: {
  conv: ConversationRecord;
  tau: number;
  degraded: boolean;
  isNewId: string | null;
  busyId: string | null;
  resolveError: string | null;
  onResolve: (messageId: string, label: ClassKey) => void;
  /** Back nav: return to the conversation list. Only shown below md, where
   *  the list is a separate screen. */
  onBack?: () => void;
  /** An external AI column exists at xl+ (the page renders it). */
  rail?: boolean;
}) {
  const { t } = usePrefs();
  const msgs = conv.messages.filter(Boolean);
  // Every hook runs before the early return below, whichever conversation is
  // open. The deck starts collapsed: the chat is what you came for, and the
  // details are one tap away (at xl they are on screen in the page's rail).
  const [aiOpen, setAiOpen] = useState(false);

  const latest = msgs[msgs.length - 1] ?? conv.last_message;
  if (!latest) return null;
  const pred = latest.prediction;
  const lane: Lane = route(signalsOf(pred), tau)[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── thread header ── */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        {/* back button: phones only — from md up the list is on screen already */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-full p-1 text-muted transition hover:bg-surface hover:text-ink md:hidden"
            aria-label={t("inbox.backToInbox")}
          >
            <ArrowLeftIcon size={18} />
          </button>
        )}

        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 font-mono text-sm font-medium text-ink"
          aria-hidden
        >
          {conv.customer_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[19px] leading-tight text-ink">{conv.customer_name}</p>
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
        <div className="shrink-0 px-4 pt-3">
          <div
            className={`${COLUMN} p-4`}
            style={{
              background: "var(--scam-tint)",
              borderRadius: "var(--radius-xl)",
            }}
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
        </div>
      )}

      {/* ── messages: messenger-like chat area ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">          <div className={`${COLUMN} flex flex-col gap-3`}>
          {msgs.map((m: MessageRecord) => (
            <MessageBubble key={m.id} msg={m} isNew={m.id === isNewId} />
          ))}
          {msgs.length > 1 && (
            <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {t("inbox.olderMessages")} · {pred.engine}
            </p>
          )}
        </div>
      </div>

      {/* ── resolve banner (review items): its own bar, and never inside the
          collapsible deck below, so the one action that matters cannot be
          hidden behind a collapsed panel or scroll away with the details ── */}
      {lane === "review" && (
        <div className="shrink-0 px-4 py-3">
          <div className={COLUMN}>
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
        </div>
      )}

      {/* ── details deck ──────────────────────────────────────────────────
          Below xl the panel is on request: the conversation is the point, and
          a permanently open 500px panel left 110px of chat at 1024px and 45px
          at 700px tall. Open, it is capped and scrolls on its own, so the
          chat always keeps most of the pane.

          At xl there is a real column for it (the page's rail), so the deck
          steps aside instead of being a second copy of the same panel. */}
      <div
        className={`max-h-[55%] shrink-0 overflow-y-auto overscroll-contain px-4 pb-3 ${
          rail ? "xl:hidden" : ""
        }`}
      >
        <div className={COLUMN}>
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            aria-expanded={aiOpen}
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-2.5 shadow-soft xl:hidden"
          >
            <span className="label text-muted">{t("inbox.messageDetails")}</span>
            {aiOpen ? (
              <ChevronUpIcon size={14} className="text-muted" aria-hidden />
            ) : (
              <ChevronDownIcon size={14} className="text-muted" aria-hidden />
            )}
          </button>

          <div className={`${aiOpen ? "block" : "hidden"} mt-3`}>
            <AIPanel pred={pred} tau={tau} degraded={degraded} />
          </div>
        </div>
      </div>
    </div>
  );
}

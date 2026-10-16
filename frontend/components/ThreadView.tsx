"use client";
/** Thread view (docs/06 §4.2): chat bubbles, original script preserved,
 * sticky resolve banner on review items, red warning card on scam items. */
import { fmtClock } from "@/lib/brand";
import { route } from "@/lib/route";
import type { ClassKey, ConversationRecord, Lane, MessageRecord } from "@/lib/types";
import { AIPanel, signalsOf } from "./AIPanel";
import { ClassChip } from "./ClassChip";
import { MessageBubble } from "./MessageBubble";
import { ResolveBar } from "./ResolveBar";
import { AlertIcon } from "./icons";

export function ThreadView({
  conv,
  tau,
  degraded,
  isNewId,
  busyId,
  resolveError,
  onResolve,
}: {
  conv: ConversationRecord;
  tau: number;
  degraded: boolean;
  isNewId: string | null;
  busyId: string | null;
  resolveError: string | null;
  onResolve: (messageId: string, label: ClassKey) => void;
}) {
  const msgs = conv.messages.filter(Boolean);
  const latest = msgs[msgs.length - 1] ?? conv.last_message;
  if (!latest) return null;
  const pred = latest.prediction;
  const lane: Lane = route(signalsOf(pred), tau)[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* thread header */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink font-mono text-sm font-medium text-paper"
          aria-hidden
        >
          {conv.customer_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{conv.customer_name}</p>
          <p className="index text-[10px] text-muted">{fmtClock(conv.created_at)}</p>
        </div>
        <span className="ml-auto">
          <ClassChip classKey={pred.top_class} />
        </span>
      </div>

      {/* scam warning card in thread (docs/06 §4.2) */}
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
            <AlertIcon size={13} /> Possible scam. Do not send items or advance payments.
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            scam probability {pred.scam_prob.toFixed(2)} · never auto-handled
          </p>
        </div>
      )}

      {/* messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {msgs.map((m: MessageRecord) => (
          <MessageBubble key={m.id} msg={m} isNew={m.id === isNewId} />
        ))}
        {msgs.length > 1 && (
          <p className="pt-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            older messages classified in one pass · {pred.engine}
          </p>
        )}
      </div>

      {/* right-hand detail: AI panel + resolve (single column on mobile) */}
      <div className="border-t border-line bg-paper px-4 py-4 lg:hidden">
        <AIPanel pred={pred} tau={tau} degraded={degraded} />
        <div className="mt-3">
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

      {/* desktop sticky resolve under messages */}
      <div className="hidden px-4 pb-4 lg:block">
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
  );
}

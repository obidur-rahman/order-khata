"use client";
/** Chat bubble (docs/06 §4.2): messenger-like bubbles, original script
 * preserved, Bengali-capable font stack. Incoming customer messages are
 * right-aligned (like messenger); the bubble is a soft slip with a timestamp
 * row underneath.
 *
 * `align` controls bubble alignment: "right" (incoming, default) or
 * "left" (outgoing / system). All current messages are incoming customer
 * messages, so right-aligned by default. */
import { fmtTime } from "@/lib/brand";
import type { MessageRecord } from "@/lib/types";

export function MessageBubble({
  msg,
  isNew,
  align = "right",
}: {
  msg: MessageRecord;
  isNew?: boolean;
  /** Bubble alignment: "right" for incoming (customer), "left" for outgoing. */
  align?: "right" | "left";
}) {
  const isRight = align === "right";
  return (
    <div
      className={`flex ${isRight ? "justify-end" : "justify-start"} ${isNew ? "msg-new" : ""}`}
    >
      <div
        className={`max-w-[88%] rounded-2xl rounded-${isRight ? "tr" : "br"}-md border border-line bg-surface px-4 py-2.5 shadow-soft`}
      >
        <p className="msg-text text-ink">{msg.text}</p>
        <div
          className={`mt-1.5 flex items-center gap-2 px-0.5 pb-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted ${
            isRight ? "justify-end" : "justify-start"
          }`}
        >
          <span>{fmtTime(msg.received_at)}</span>
          <span className="text-line">/</span>
          <span>{msg.script}</span>
          {msg.source === "simulator" && (
            <>
              <span className="text-line">/</span>
              <span>simulated feed</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

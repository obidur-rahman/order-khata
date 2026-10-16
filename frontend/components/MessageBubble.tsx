"use client";
/** Chat bubble (docs/06 §4.2): original script preserved, Bengali-capable
 * font stack, incoming messages left-aligned. A soft slip, tucked at the
 * bottom-left so the thread reads as a conversation, not a stack of boxes. */
import { fmtTime } from "@/lib/brand";
import type { MessageRecord } from "@/lib/types";

export function MessageBubble({
  msg,
  isNew,
}: {
  msg: MessageRecord;
  isNew?: boolean;
}) {
  return (
    <div className={`max-w-[85%] ${isNew ? "msg-new" : ""}`}>
      <div className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 shadow-soft">
        <p className="msg-text text-ink">{msg.text}</p>
      </div>
      <div className="mt-1.5 flex items-center gap-2 px-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
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
  );
}

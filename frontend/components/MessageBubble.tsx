"use client";
/** Chat bubble (docs/06 §4.2): original script preserved, Bengali-capable
 * font stack, incoming messages left-aligned. */
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
      <div className="rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-2.5 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
        <p className="msg-text text-ink">{msg.text}</p>
      </div>
      <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-muted">
        <span>{fmtTime(msg.received_at)}</span>
        <span>·</span>
        <span className="uppercase tracking-wide">{msg.script}</span>
        {msg.source === "simulator" && <span>· simulated feed</span>}
      </div>
    </div>
  );
}

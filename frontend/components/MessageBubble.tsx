"use client";
/** Chat bubble, quiet skin: soft rounded pill-ish bubble, no border, gentle
 * surface. Original script preserved, Bengali-capable stack. */
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
  const flatCorner = isRight ? "rounded-br-md" : "rounded-bl-md";
  return (
    <div
      className={`flex ${isRight ? "justify-end" : "justify-start"} ${isNew ? "msg-new" : ""}`}
    >
      <div
        className={`max-w-[88%] rounded-3xl ${flatCorner} bg-surface px-5 py-3 shadow-soft lg:max-w-[34rem]`}
      >
        <p className="msg-text text-ink">{msg.text}</p>
        <div
          className={`mt-1.5 flex items-center gap-2 text-[10.5px] text-muted ${
            isRight ? "justify-end" : "justify-start"
          }`}
        >
          <span>{fmtTime(msg.received_at)}</span>
          <span className="text-line-strong">·</span>
          <span>{msg.script}</span>
          {msg.source === "simulator" && (
            <>
              <span className="text-line-strong">·</span>
              <span>simulated feed</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
/** Branded loading screen for cold start (docs/06 §6). Editorial: an index
 * dateline, a display line, and a hairline progress rule. */
import { LogoMark } from "./Logo";

export function LoadingScreen({ note }: { note?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <span className="label text-muted">Order Khata / cold start</span>
      <div className="relative">
        <LogoMark size={64} />
        <span className="absolute -right-1 -bottom-1 h-3 w-3 animate-ping rounded-full bg-accent" aria-hidden />
      </div>
      <div>
        <p className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Waking up the inbox
        </p>
        <p className="mt-2 max-w-md text-sm text-muted">
          {note ?? "Models load on first boot of the free Space (usually under a minute)."}
        </p>
      </div>
      <div className="h-1 w-64 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-[fade-up_1.2s_ease-in-out_infinite_alternate] rounded-full bg-accent" />
      </div>
    </div>
  );
}

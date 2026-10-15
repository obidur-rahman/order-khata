"use client";
/** Branded loading screen for cold start (docs/06 §6). */
import { LogoMark } from "./Logo";

export function LoadingScreen({ note }: { note?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <div className="relative">
        <LogoMark size={64} />
        <span className="absolute -right-1 -bottom-1 h-4 w-4 animate-ping rounded-full bg-brand" aria-hidden />
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold text-ink">Waking up the inbox…</p>
        <p className="mt-1 text-sm text-muted">
          {note ?? "Models load on first boot of the free Space (usually under a minute)."}
        </p>
      </div>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-[fade-up_1.2s_ease-in-out_infinite_alternate] rounded-full bg-brand-deep" />
      </div>
    </div>
  );
}

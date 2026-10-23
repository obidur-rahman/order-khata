"use client";
/** Branded loading screen for cold start (docs/06 §6). Quiet: the mark, one
 * line, a soft breathing dot.
 *
 * It renders its own <main> and a real (screen-reader) h1, so a page that is
 * still waiting for the API is never a document without a landmark or a
 * heading — crawlers and assistive tech see the same structure as everyone. */
import { LogoMark } from "./Logo";

export function LoadingScreen({ note, page }: { note?: string; page: string }) {
  return (
    <main id="main" className="lamp flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <h1 className="sr-only">{page}</h1>
      <LogoMark size={56} />
      <div>
        <p className="display text-[30px] text-ink">Waking up the inbox</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          {note ?? "Models load on first boot of the free Space (usually under a minute)."}
        </p>
      </div>
      <span className="live-dot h-2 w-2 rounded-full bg-mark" aria-hidden />
    </main>
  );
}

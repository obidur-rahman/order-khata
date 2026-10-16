"use client";
/** Designed "cannot reach the API" screen (docs/06 §6: error states are
 * designed, never a blank or an endless spinner). The app screens are a static
 * shell; the data lives behind the FastAPI backend on the same origin. */
import { ArrowRightIcon } from "./icons";

export function ErrorScreen({
  detail,
  onRetry,
}: {
  /** Underlying message (fetch failure, HTTP status…). */
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <span className="label text-muted">Order Khata / no backend</span>

      <div className="max-w-lg rounded-3xl border border-line bg-surface p-8 text-left shadow-lift">
        <p className="label text-accent">cannot reach the api</p>
        <p className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-tight text-ink">
          This page is a static shell. The inbox lives in the API.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Every number and message comes from the FastAPI backend. Start it (or wait for the
          free Space to finish booting), then retry.
        </p>
        <p className="mt-4 rounded-xl border border-line bg-paper px-3.5 py-2 font-mono text-[12px] text-ink">
          cd backend && python -m uvicorn app.main:app --port 7860
        </p>
        {detail && (
          <p className="mt-3 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
            {detail}
          </p>
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="group mt-6 inline-flex items-center gap-3 rounded-full bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-paper shadow-soft transition hover:bg-accent-deep"
          >
            Retry
            <ArrowRightIcon size={14} className="text-accent transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </div>
  );
}

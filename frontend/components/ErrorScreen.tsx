"use client";
/** Designed "cannot reach the API" screen (docs/06 §6: error states are
 * designed, never a blank or an endless spinner). The app screens are a static
 * shell; the data lives behind the FastAPI backend on the same origin.
 *
 * Like LoadingScreen it owns a <main> and a screen-reader h1. */
import { ArrowRightIcon } from "./icons";

export function ErrorScreen({
  detail,
  onRetry,
  page,
}: {
  /** Underlying message (fetch failure, HTTP status…). */
  detail?: string | null;
  onRetry?: () => void;
  page: string;
}) {
  return (
    <main id="main" className="lamp flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <h1 className="sr-only">{page}</h1>

      <div className="sheet max-w-lg p-8 text-left">
        <p className="label" style={{ color: "var(--lane-scam)" }}>
          cannot reach the api
        </p>
        <p className="display mt-4 text-[26px] text-ink">
          This page is a shell. The inbox lives in the API.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Every number and message comes from the FastAPI backend. Start it (or wait for the
          free Space to finish booting), then retry.
        </p>
        <p className="index mt-4 rounded-2xl bg-surface2/70 px-4 py-2.5 text-[12px] text-ink">
          cd backend && python -m uvicorn app.main:app --port 7860
        </p>
        {detail && (
          <p className="label mt-3 text-muted">{detail}</p>
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="group mt-6 inline-flex items-center gap-3 rounded-full bg-btn px-6 py-3 text-[12.5px] font-medium text-btn-ink transition hover:opacity-85"
          >
            Retry
            <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </main>
  );
}

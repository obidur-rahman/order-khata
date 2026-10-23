"use client";
/** 404 — "This page is not in the ledger." Quiet: a soft pool of light, one
 * large line, two pill keys. */
import Link from "next/link";
import { usePrefs } from "@/lib/prefs";
import { Reveal } from "./Reveal";

export function NotFoundView() {
  const { t } = usePrefs();
  return (
    <main className="lamp relative min-h-[calc(100dvh-57px)] overflow-hidden bg-paper">
      <div className="relative mx-auto flex min-h-[calc(100dvh-57px)] max-w-[1180px] flex-col justify-center px-5 py-20 md:px-8">
        <Reveal>
          <div className="max-w-xl">
            <p className="label text-muted">{t("notfound.stamp")}</p>
            <h1
              className="display mt-4 text-ink"
              style={{ fontSize: "clamp(36px, 6vw, 68px)" }}
            >
              {t("notfound.title")}
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-muted">
              {t("notfound.lede")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/"
                className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-btn px-7 py-3.5 text-[13.5px] font-medium text-btn-ink shadow-lift transition hover:-translate-y-0.5 hover:opacity-90"
              >
                {t("notfound.home")}
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/inbox"
                className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line-strong px-7 py-3.5 text-[13.5px] font-medium text-ink transition hover:-translate-y-0.5 hover:border-ink/40 hover:bg-accent-tint"
              >
                {t("nav.inbox")} ↗
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}

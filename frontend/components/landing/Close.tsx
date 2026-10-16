"use client";
/** Closing narrative: honesty, the final call to action, the footer. */
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/icons";
import { usePrefs } from "@/lib/prefs";
import { ArrowLink, Section, SectionHead } from "./parts";

const PROVENANCE = ["honest.data.1", "honest.data.2", "honest.data.3"];
const LIMITS = ["honest.limit.1", "honest.limit.2", "honest.limit.3"];

export function BuiltHonest() {
  const { t } = usePrefs();
  return (
    <Section>
      <SectionHead
        title={
          <>
            {t("honest.t1")}
            <br />
            {t("honest.t2")}
          </>
        }
      />

      <div className="mt-20 grid gap-x-16 gap-y-14 md:grid-cols-2">
        <div>
          <p className="label border-b border-line pb-4 text-muted">{t("honest.provenance")}</p>
          <ul className="mt-6 space-y-5">
            {PROVENANCE.map((k) => (
              <li key={k} className="flex gap-4 text-[15px] leading-relaxed text-ink">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label border-b border-line pb-4 text-muted">{t("honest.limits")}</p>
          <ul className="mt-6 space-y-5">
            {LIMITS.map((k) => (
              <li key={k} className="flex gap-4 text-[15px] leading-relaxed text-muted">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line" aria-hidden />
                {t(k)}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ArrowLink href="/evaluation/">{t("honest.allLimits")}</ArrowLink>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function FinalCTA() {
  const { t } = usePrefs();
  return (
    <section className="px-4 py-24 md:px-6 md:py-32">
      {/* the one inverted surface: a soft dark card, so the closing block
          keeps its weight without hard corners cutting into the page */}
      <div className="mx-auto max-w-[1400px] rounded-3xl bg-contrast px-8 py-20 text-oncontrast shadow-lift md:px-16 md:py-28">
        <p className="label text-oncontrast/50">{t("cta.kicker")}</p>
        <h2
          className="mt-8 font-display font-extrabold text-oncontrast"
          style={{ fontSize: "clamp(42px, 8vw, 112px)", lineHeight: 0.96, letterSpacing: "-0.045em" }}
        >
          {t("hero.t1a")} {t("hero.t1b")}
          <br />
          {t("hero.t2a")} <span style={{ color: "var(--on-review)" }}>{t("hero.t2b")}</span>
        </h2>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/inbox/"
            className="group inline-flex items-center gap-3 rounded-full bg-oncontrast px-7 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-contrast shadow-soft transition hover:bg-oncontrast/90"
          >
            {t("hero.ctaInbox")}
            <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/try/"
            className="group inline-flex items-center gap-2.5 rounded-full border border-oncontrast/25 px-7 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-oncontrast transition hover:border-oncontrast"
          >
            {t("cta.try")}
            <ArrowUpRightIcon size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const { t } = usePrefs();
  const columns = [
    {
      title: t("footer.product"),
      links: [
        { href: "/inbox/", label: t("nav.inbox") },
        { href: "/try/", label: t("nav.try") },
        { href: "/dashboard/", label: t("nav.dashboard") },
      ],
    },
    {
      title: t("footer.proof"),
      links: [
        { href: "/evaluation/", label: t("nav.evaluation") },
        { href: "/preferences/", label: t("nav.preferences") },
      ],
    },
  ];

  return (
    <footer className="border-t border-line px-6 py-16">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <Logo size={26} />
          <p className="mt-6 text-[14px] leading-relaxed text-muted">{t("footer.blurb")}</p>
        </div>
        <div className="flex flex-wrap gap-x-16 gap-y-8">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="label text-muted">{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14px] text-ink transition hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-[1400px] flex-wrap items-center justify-between gap-3 border-t border-line pt-8">
        <p className="label text-muted">{t("footer.note")}</p>
        <p className="label text-muted">{t("footer.legal")}</p>
      </div>
    </footer>
  );
}

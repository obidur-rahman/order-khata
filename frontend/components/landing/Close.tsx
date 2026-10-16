"use client";
/** Closing narrative: honesty, the final call to action, the footer. */
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/icons";
import { usePrefs } from "@/lib/prefs";
import { Reveal } from "../Reveal";
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

const FOOT_LINKS = [
  { href: "/inbox/", key: "nav.inbox" },
  { href: "/try/", key: "nav.try" },
  { href: "/dashboard/", key: "nav.dashboard" },
  { href: "/evaluation/", key: "nav.evaluation" },
  { href: "/preferences/", key: "nav.preferences" },
];

export function SiteFooter() {
  const { t } = usePrefs();
  return (
    <footer className="px-4 pb-12 md:px-6">
      {/* the closing block: an oversized brand panel that bookends the hero's
          colour field, with everything practical compressed into the strip
          below it */}
      <Reveal>
        <div className="wash relative mx-auto max-w-[1400px] overflow-hidden rounded-3xl px-6 py-16 shadow-lift md:px-14 md:py-24">
          <div
            aria-hidden
            className="dotgrid pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
          />
          <div className="relative flex flex-col items-center gap-7 text-center">
            <Logo size={56} />
            <p
              className="font-display font-extrabold text-ink"
              style={{ fontSize: "clamp(44px, 9vw, 118px)", lineHeight: 0.96, letterSpacing: "-0.04em" }}
            >
              Order Khata
            </p>
            <p className="max-w-xl text-[15px] leading-relaxed text-muted">{t("footer.blurb")}</p>
            <Link
              href="/inbox/"
              className="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-paper shadow-soft transition hover:bg-accent-deep"
            >
              {t("hero.ctaInbox")}
              <ArrowRightIcon size={16} className="text-accent transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* slim strip: the five links, then honesty + provenance in one line */}
      <div className="mx-auto mt-8 flex max-w-[1400px] flex-col items-center gap-5">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2"
          aria-label="Footer"
        >
          {FOOT_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] text-ink underline decoration-line underline-offset-4 transition hover:text-accent hover:decoration-accent"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>
        <p className="label max-w-4xl text-center leading-[1.9] text-muted">
          {t("footer.note")} · {t("footer.credits")} · {t("footer.legal")}
        </p>
      </div>
    </footer>
  );
}

"use client";
/** Closing narrative, quiet skin: honesty lists as soft columns, the final
 * call to action, the footer. */
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { ArrowRightIcon } from "@/components/icons";
import { usePrefs } from "@/lib/prefs";
import { Reveal } from "../Reveal";
import { ArrowLink, PrimaryCTA, Section, SectionHead } from "./parts";

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

      <div className="mt-14 grid gap-x-16 gap-y-12 md:grid-cols-2">
        <div>
          <p className="label pb-1 text-muted">{t("honest.provenance")}</p>
          <ul className="mt-4 space-y-3">
            {PROVENANCE.map((k, i) => (
              <li key={k} className="flex gap-4 rounded-[22px] bg-surface p-5 shadow-soft">
                <span className="index shrink-0 pt-0.5 text-[11px] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14.5px] leading-[1.7] text-ink">{t(k)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label pb-1 text-muted">{t("honest.limits")}</p>
          <ul className="mt-4 space-y-3">
            {LIMITS.map((k, i) => (
              <li key={k} className="flex gap-4 rounded-[22px] bg-surface p-5 shadow-soft">
                <span className="index shrink-0 pt-0.5 text-[11px] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14.5px] leading-[1.7] text-muted">{t(k)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <ArrowLink href="/evaluation/">{t("honest.allLimits")}</ArrowLink>
          </div>
        </div>
      </div>
    </Section>
  );
}

/** The closing block: one line, one key. */
function Closing() {
  const { t } = usePrefs();
  return (
    <section className="wash relative overflow-hidden px-5 py-24 md:px-8 md:py-32">
      <div className="relative mx-auto max-w-[1180px]">
        <Reveal>
          <span className="mark mb-8 inline-block h-1 w-14 rounded-full" aria-hidden />
          <h2 className="display max-w-[26ch] text-ink" style={{ fontSize: "clamp(32px, 4.4vw, 58px)" }}>
            {t("close.t1")}
            <br />
            {t("close.t2")}
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <PrimaryCTA href="/inbox/">{t("hero.ctaInbox")}</PrimaryCTA>
            <ArrowLink href="/evaluation/" className="ml-2">
              {t("hero.ctaEval")}
            </ArrowLink>
          </div>
        </Reveal>
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
    <footer className="px-5 pb-12 pt-16 md:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <div className="grid gap-10 md:grid-cols-[1.6fr_0.9fr_1.5fr] md:gap-14">
            <div>
              <Logo size={26} />
              <p className="mt-4 max-w-xs text-[13.5px] leading-[1.7] text-muted">{t("footer.blurb")}</p>
              <Link
                href="/inbox/"
                prefetch={false}
                className="group mt-5 inline-flex min-h-6 items-center gap-2 text-[13px] font-medium text-ink transition hover:opacity-70"
              >
                {t("hero.ctaInbox")}
                <ArrowRightIcon size={13} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <nav aria-label="Footer">
              <p className="label text-muted">{t("footer.product")}</p>
              <ul className="mt-4 space-y-2.5">
                {FOOT_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      prefetch={false}
                      className="inline-flex min-h-6 items-center text-[13.5px] text-ink transition hover:opacity-70"
                    >
                      {t(l.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="label text-muted">{t("footer.proof")}</p>
              <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-muted">
                <li>{t("footer.note")}</li>
                <li>{t("footer.credits")}</li>
              </ul>
              <Link
                href="/evaluation/"
                prefetch={false}
                className="group mt-4 inline-flex min-h-6 items-center gap-2 text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-ink"
              >
                {t("honest.allLimits")}
                <ArrowRightIcon size={13} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <p className="label mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 pt-6 text-muted">
            <span>{t("footer.legal")}</span>
            <span className="hidden h-px flex-1 bg-line sm:block" aria-hidden />
            <span>4 datasets · 0 paid APIs</span>
          </p>
        </Reveal>
      </div>
    </footer>
  );
}

export { Closing };

"use client";
/** Closing narrative: honesty, the final call to action, the footer. */
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { ArrowRightIcon } from "@/components/icons";
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
    <footer className="border-t border-line px-4 pb-12 pt-16 md:px-6 md:pt-20">
      <div className="mx-auto max-w-[1400px]">
        {/* Editorial, not a second hero: the foot closes the page with the
            same surface, hairlines and mono labels the rest of the site uses,
            and it does not repeat the wash field or the display headline. */}
        <Reveal>
          <div className="grid gap-12 md:grid-cols-[1.7fr_1fr_1.3fr] md:gap-16">
            {/* brand */}
            <div>
              <Logo size={26} />
              <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-muted">{t("footer.blurb")}</p>
              <Link
                href="/inbox/"
                className="group mt-6 inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent transition hover:text-accent-deep"
              >
                {t("hero.ctaInbox")}
                <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* sections */}
            <nav aria-label="Footer">
              <p className="label border-b border-line pb-3 text-muted">{t("footer.product")}</p>
              <ul className="mt-4 space-y-3">
                {FOOT_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14px] text-ink transition hover:text-accent">
                      {t(l.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* honesty: the disclosures live here, in the open */}
            <div>
              <p className="label border-b border-line pb-3 text-muted">{t("footer.proof")}</p>
              <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted">
                <li>{t("footer.note")}</li>
                <li>{t("footer.credits")}</li>
              </ul>
              <Link
                href="/evaluation/"
                className="group mt-5 inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent transition hover:text-accent-deep"
              >
                {t("honest.allLimits")}
                <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <p className="mt-14 border-t border-line pt-6 label text-muted">{t("footer.legal")}</p>
        </Reveal>
      </div>
    </footer>
  );
}

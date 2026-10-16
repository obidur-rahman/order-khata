"use client";
/** Landing masthead + hero (docs/06 §4.1).
 *
 * The hero is a full-bleed colour field (`.wash`) rather than a photograph:
 * every hue here is drawn from the token set, so it survives the theme
 * switch. No scroll cue — the page is long but nothing needs announcing.
 */
import Link from "next/link";

import { TopBar } from "@/components/AppBar";
import { CLASS_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import { CLASSES } from "@/lib/types";
import { GhostCTA, PrimaryCTA } from "./parts";

export function LandingBar() {
  const { t } = usePrefs();
  return (
    <TopBar
      trailing={
        <Link
          href="/inbox/"
          className="hidden rounded-full bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-paper shadow-soft transition hover:bg-accent-deep sm:inline-flex"
        >
          {t("nav.openInbox")}
        </Link>
      }
    />
  );
}

export function Hero() {
  const { t } = usePrefs();
  return (
    <section className="relative isolate overflow-hidden">
      {/* colour field: the committed washes, then four token-coloured orbs
          that drift slowly behind the type (globals.css .hero-blob) — all
          colour comes from the palette, so the dark theme stays correct */}
      <div className="wash pointer-events-none absolute inset-0" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span
          className="hero-blob"
          style={{
            top: "-16%",
            left: "-8%",
            width: "42rem",
            height: "42rem",
            background: "color-mix(in oklab, var(--accent) 45%, transparent)",
            animationDuration: "24s",
          }}
        />
        <span
          className="hero-blob"
          style={{
            top: "-12%",
            right: "-6%",
            width: "36rem",
            height: "36rem",
            background: "color-mix(in oklab, var(--c-price) 42%, transparent)",
            animationDuration: "31s",
            animationDelay: "-7s",
          }}
        />
        <span
          className="hero-blob"
          style={{
            bottom: "-20%",
            right: "10%",
            width: "34rem",
            height: "34rem",
            background: "color-mix(in oklab, var(--c-delivery) 38%, transparent)",
            animationDuration: "27s",
            animationDelay: "-13s",
          }}
        />
        <span
          className="hero-blob"
          style={{
            bottom: "-16%",
            left: "4%",
            width: "30rem",
            height: "30rem",
            background: "color-mix(in oklab, var(--c-complaint) 34%, transparent)",
            animationDuration: "34s",
            animationDelay: "-20s",
          }}
        />
      </div>
      <div
        aria-hidden
        className="dotgrid pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
      />

      <div className="relative mx-auto flex min-h-[86vh] max-w-[1400px] flex-col px-6">
        {/* statement — centred on the screen (docs/06 §4.1). No dateline row:
            the tagline and "simulated Page feed" label were removed here; the
            simulation is still disclosed in the footer and on Evaluation. */}
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center md:py-32">
          <h1
            className="fade-up max-w-[16ch] font-display font-extrabold text-ink"
            style={{
              fontSize: "clamp(46px, 9vw, 128px)",
              lineHeight: 0.94,
              letterSpacing: "-0.045em",
              animationDelay: "60ms",
            }}
          >
            {t("hero.t1a")}{" "}
            <span className="text-muted line-through decoration-accent decoration-[0.045em]">
              {t("hero.t1b")}
            </span>
            <br />
            {t("hero.t2a")} <span className="text-accent">{t("hero.t2b")}</span>
          </h1>

          <p
            className="fade-up mt-12 max-w-2xl text-[18px] leading-[1.7] text-muted md:mt-14"
            style={{ animationDelay: "180ms" }}
          >
            {t("hero.lede")}
          </p>

          <div
            className="fade-up mt-10 flex flex-wrap justify-center gap-3"
            style={{ animationDelay: "300ms" }}
          >
            <PrimaryCTA href="/inbox/">{t("hero.ctaInbox")}</PrimaryCTA>
            <GhostCTA href="/evaluation/">{t("hero.ctaEval")}</GhostCTA>
          </div>
        </div>

        {/* the six things a message can be */}
        <div
          className="fade-up flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-t border-line py-6"
          style={{ animationDelay: "440ms" }}
        >
          <span className="label text-muted">{t("hero.legend")}</span>
          {CLASSES.map((c) => (
            <span key={c} className="label flex items-center gap-2.5 text-ink">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_META[c].color }} aria-hidden />
              {CLASS_META[c].label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";
/** "How it works" — the server pipeline as five steps on one rail.
 * The tags stay in English: they are the names of the real stages (text,
 * engine A, hard rule, engine B, policy) and the docs use the same words. */
import { usePrefs } from "@/lib/prefs";
import { Reveal } from "../Reveal";
import { Section, SectionHead } from "./parts";

const STEPS = [
  { k: "how.1", tag: "text", tone: "var(--accent)" },
  { k: "how.2", tag: "engine A", tone: "var(--c-order)" },
  { k: "how.3", tag: "hard rule", tone: "var(--lane-scam)" },
  { k: "how.4", tag: "engine B", tone: "var(--c-price)" },
  { k: "how.5", tag: "policy", tone: "var(--c-delivery)" },
];

export function HowItWorks() {
  const { t } = usePrefs();
  return (
    <Section className="bg-accent-tint/40">
      <SectionHead
        title={
          <>
            {t("how.t1")}
            <br />
            {t("how.t2")}
          </>
        }
        lede={t("how.lede")}
      />

      <ol className="mt-20 grid gap-x-8 gap-y-14 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.k}>
            <Reveal delay={i * 70}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.tone }} aria-hidden />
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span className="label shrink-0 text-muted">{s.tag}</span>
            </div>
            <h3 className="mt-6 font-display text-[17px] leading-tight font-bold text-ink">
              {t(`${s.k}.title`)}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">{t(`${s.k}.body`)}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

"use client";
/** "How it works" — the pipeline as five quiet rows. Soft hover lift, no
 * ruled borders. Tags stay in English: they name the real stages. */
import { usePrefs } from "@/lib/prefs";
import { Reveal } from "../Reveal";
import { Section, SectionHead } from "./parts";

const STEPS = [
  { k: "how.1", tag: "text", tone: "var(--muted)" },
  { k: "how.2", tag: "engine A", tone: "var(--c-order)" },
  { k: "how.3", tag: "hard rule", tone: "var(--lane-scam)" },
  { k: "how.4", tag: "engine B", tone: "var(--c-price)" },
  { k: "how.5", tag: "policy", tone: "var(--c-delivery)" },
];

export function HowItWorks() {
  const { t } = usePrefs();
  return (
    <Section>
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

      <ol className="mt-14 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.k}>
            <Reveal delay={i * 60}>
              <div className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-2 rounded-[26px] bg-surface px-6 py-7 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift md:grid-cols-[4rem_1fr_auto] md:gap-x-8 md:px-8">
                <span className="index text-[12px] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="display text-[24px] text-ink md:text-[28px]">{t(`${s.k}.title`)}</h3>
                  <p className="mt-2 max-w-xl text-[14.5px] leading-[1.75] text-muted">
                    {t(`${s.k}.body`)}
                  </p>
                </div>
                <span
                  className="label hidden items-center gap-2 self-start pt-2 md:inline-flex"
                  style={{ color: s.tone }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.tone }} aria-hidden />
                  {s.tag}
                </span>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

"use client";
/** Landing narrative, quiet skin: the problem, then the three lanes.
 * Specimen messages are illustrative, hand-picked strings — labelled as such,
 * never counted as evidence (docs/07). */
import { LaneIcon } from "@/components/LaneChip";
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import type { Lane } from "@/lib/types";
import { Reveal } from "../Reveal";
import { Section, SectionHead } from "./parts";

/** Three true facts, set large and quiet. */
const FACTS: { k: string; n: string }[] = [
  { k: "fact.scripts", n: "3" },
  { k: "fact.classes", n: "6" },
  { k: "fact.rule", n: "1" },
];

const LANE_KEY: Record<Lane, string> = {
  auto: "lane.auto",
  review: "lane.review",
  scam: "lane.scam",
};

export function TheProblem() {
  const { t } = usePrefs();
  return (
    <Section>
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <Reveal>
            <h2 className="display text-ink" style={{ fontSize: "clamp(32px, 4.2vw, 58px)" }}>
              {t("problem.t1")}
              <br />
              {t("problem.t2")}
            </h2>
          </Reveal>
        </div>
        <div className="md:col-span-5 md:pt-3">
          <Reveal delay={90}>
            <p className="max-w-md text-[16px] leading-[1.8] text-muted">{t("problem.lede")}</p>
            <blockquote className="mt-8 rounded-r-2xl border-l-2 border-mark pl-5 font-display text-[21px] leading-[1.5] text-ink md:text-[23px]">
              {t("problem.quote")}
            </blockquote>
          </Reveal>
        </div>
      </div>

      <div className="mt-20 grid gap-6 sm:grid-cols-3 md:gap-8">
        {FACTS.map((f, i) => (
          <Reveal key={f.k} delay={i * 80}>
            <div className="rounded-[26px] bg-surface p-7 shadow-soft">
              <span className="tnum block text-[56px] text-ink">{f.n}</span>
              <span className="label mt-3 block text-muted">{t(f.k)}</span>
              <p className="mt-4 text-[13.5px] leading-[1.7] text-muted">{t(`${f.k}.body`)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

interface Specimen {
  lane: Lane;
  rule: string;
  text: string;
  script: string;
}

const SPECIMENS: Specimen[] = [
  {
    lane: "auto",
    rule: "top_prob ≥ τ and the second opinion agrees",
    text: "ei kurta ta ki 42 size e ache? ami nite chai",
    script: "banglish",
  },
  {
    lane: "review",
    rule: "low confidence, escalation or disagreement",
    text: "daam ta ektu kom hobe na? ami ekbar order korechi kintu ekhon bhul lagche",
    script: "banglish",
  },
  {
    lane: "scam",
    rule: "scam_prob ≥ 0.70 · never auto-handled",
    text: "Send the OTP to verify your account and click this link to claim your prize",
    script: "english",
  },
];

export function TheLanes() {
  const { t } = usePrefs();
  return (
    <Section tone="sheet">
      <SectionHead
        variant="margin"
        title={
          <>
            {t("lanes.t1")}
            <br />
            {t("lanes.t2")}
          </>
        }
        lede={t("lanes.lede")}
      />

      <div className="mt-14 grid gap-5 md:grid-cols-3 md:gap-6">
        {SPECIMENS.map((s, i) => {
          const m = LANE_META[s.lane];
          return (
            <Reveal key={s.lane} delay={i * 80}>
              <article className="flex h-full flex-col rounded-[28px] bg-paper p-7 shadow-soft">
                <span
                  className="label inline-flex items-center gap-2"
                  style={{ color: m.deep }}
                >
                  <LaneIcon icon={m.icon} size={13} />
                  {t(LANE_KEY[s.lane])}
                </span>

                <h3 className="display mt-5 text-[28px] text-ink">
                  {t(`lane.${s.lane}.short`)}
                </h3>

                <p className="mt-3 text-[14.5px] leading-[1.7] text-muted">
                  {t(`${LANE_KEY[s.lane]}.blurb`)}
                </p>

                <figure className="mt-7 rounded-2xl bg-surface2/60 p-4">
                  <figcaption className="label mb-2.5 flex items-center justify-between text-muted">
                    <span>{t("lanes.specimen")}</span>
                    <span>{s.script}</span>
                  </figcaption>
                  <p className="msg-text text-[14px] text-ink">{s.text}</p>
                </figure>

                <p className="index mt-auto pt-7 text-[10.5px] leading-relaxed text-muted">
                  {s.rule}
                </p>
              </article>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-muted">{t("lanes.note")}</p>
    </Section>
  );
}

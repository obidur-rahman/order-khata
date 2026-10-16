"use client";
/** Landing narrative: the problem, then the three lanes.
 * Specimen messages are illustrative, hand-picked strings — labelled as such,
 * never counted as evidence (docs/07). */
import { LaneIcon } from "@/components/LaneChip";
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import type { Lane } from "@/lib/types";
import { Section, SectionHead } from "./parts";

/** Colour carries the meaning of a fact, not of a status. */
const FACTS: { k: string; n: string; tint: string }[] = [
  { k: "fact.scripts", n: "3", tint: "var(--accent)" },
  { k: "fact.classes", n: "6", tint: "var(--c-price)" },
  { k: "fact.signals", n: "2", tint: "var(--c-delivery)" },
  { k: "fact.rule", n: "1", tint: "var(--lane-scam)" },
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
      <SectionHead
        title={
          <>
            {t("problem.t1")}
            <br />
            {t("problem.t2")}
          </>
        }
        lede={t("problem.lede")}
      />

      <blockquote
        className="mt-20 max-w-3xl border-l-2 pl-7 font-display text-2xl leading-snug font-bold text-ink md:text-[34px]"
        style={{ borderColor: "var(--accent)" }}
      >
        {t("problem.quote")}
      </blockquote>

      <dl className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.k} className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <dt className="label text-muted">{t(f.k)}</dt>
            <dd className="tnum mt-4 text-[60px] leading-none" style={{ color: f.tint }}>
              {f.n}
            </dd>
            <dd className="mt-4 text-[14px] leading-relaxed text-muted">{t(`${f.k}.body`)}</dd>
          </div>
        ))}
      </dl>
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
    text: "ei saree ta ki stock e ache? ami nite chai",
    script: "bl",
  },
  {
    lane: "review",
    rule: "low confidence, escalation or disagreement",
    text: "daam ta ektu kom hobe na? ami ekbar order korechi kintu ekhon bhul lagche",
    script: "bl",
  },
  {
    lane: "scam",
    rule: "scam_prob ≥ 0.50 · never auto-handled",
    text: "Send the OTP to verify your account and click this link to claim your prize",
    script: "en",
  },
];

export function TheLanes() {
  const { t } = usePrefs();
  return (
    <Section wash>
      <SectionHead
        title={
          <>
            {t("lanes.t1")}
            <br />
            {t("lanes.t2")}
          </>
        }
        lede={t("lanes.lede")}
      />

      <div className="mt-20 grid gap-8 md:grid-cols-3">
        {SPECIMENS.map((s) => (
          <article
            key={s.lane}
            className="flex flex-col rounded-2xl border border-line bg-surface p-7 shadow-soft"
          >
            <div className="flex items-center gap-2.5">
              <span style={{ color: `var(--lane-${s.lane})` }}>
                <LaneIcon icon={LANE_META[s.lane].icon} size={14} />
              </span>
              <span className="label text-ink">{t(LANE_KEY[s.lane])}</span>
            </div>

            <p className="mt-5 text-[16px] leading-relaxed text-ink">
              {t(`${LANE_KEY[s.lane]}.blurb`)}
            </p>

            <figure className="mt-7 rounded-xl border border-line bg-paper p-4">
              <figcaption className="label mb-3 text-muted">
                {t("lanes.specimen")} · {s.script}
              </figcaption>
              <p className="msg-text text-ink">{s.text}</p>
            </figure>

            <p className="mt-auto pt-7 font-mono text-[10.5px] leading-relaxed uppercase tracking-[0.1em] text-muted">
              {s.rule}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-10 max-w-3xl text-[14px] leading-relaxed text-muted">
        {t("lanes.note")}
      </p>
    </Section>
  );
}

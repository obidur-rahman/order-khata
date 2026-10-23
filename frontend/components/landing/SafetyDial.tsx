"use client";
/** The safety dial — an interactive picture of the routing policy, using the
 * SAME route() the server uses on hand-authored example signals. No network,
 * no database writes. Clearly labelled as illustrative.
 *
 * Quiet skin: one large soft card on a warm pool of light, not an inverted
 * slab — the only hue on the page is still the status hue. */
import { useMemo, useState } from "react";

import { ClassChip } from "@/components/ClassChip";
import { LaneIcon } from "@/components/LaneChip";
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import { route, type RouteSignals } from "@/lib/route";
import { CLASSES, type Lane } from "@/lib/types";
import { SectionHead } from "./parts";

interface Sample {
  text: string;
  signals: RouteSignals;
}

const SAMPLES: Sample[] = [
  {
    text: "ei ta ki stock e ache? ami order korte chai",
    signals: {
      top_class: "order",
      top_prob: 0.94,
      scam_prob: 0.03,
      escalate_prob: 0.02,
      llm_class: "order",
      llm_status: "ok",
    },
  },
  {
    text: "eta kobe pabo? taratari lagbe",
    signals: {
      top_class: "delivery_problem",
      top_prob: 0.71,
      scam_prob: 0.04,
      escalate_prob: 0.03,
      llm_class: "delivery_problem",
      llm_status: "ok",
    },
  },
  {
    text: "daam ta ektu kom hobe na? ami vabchi",
    signals: {
      top_class: "price_question",
      top_prob: 0.63,
      scam_prob: 0.05,
      escalate_prob: 0.04,
      llm_class: "complaint",
      llm_status: "ok",
    },
  },
  {
    text: "আমি ম্যানেজারের সাথে কথা বলতে চাই",
    signals: {
      top_class: "other",
      top_prob: 0.88,
      scam_prob: 0.02,
      escalate_prob: 0.91,
      llm_class: "other",
      llm_status: "ok",
    },
  },
  {
    text: "Send the OTP to verify your account and click this link to claim your prize",
    signals: {
      top_class: "other",
      top_prob: 0.52,
      scam_prob: 0.86,
      escalate_prob: 0.05,
      llm_class: "scam",
      llm_status: "ok",
    },
  },
];

export function SafetyDial() {
  const { t } = usePrefs();
  const [tau, setTau] = useState(0.85);

  const rows = useMemo(
    () => SAMPLES.map((s) => ({ ...s, lane: route(s.signals, tau)[0] as Lane })),
    [tau],
  );
  const counts = useMemo(() => {
    const c: Record<Lane, number> = { auto: 0, review: 0, scam: 0 };
    rows.forEach((r) => (c[r.lane] += 1));
    return c;
  }, [rows]);

  const fill = ((tau - 0.5) / (0.99 - 0.5)) * 100;

  return (
    <section className="wash relative overflow-hidden px-5 py-24 md:px-8 md:py-32">
      <div className="relative mx-auto max-w-[1180px]">
        <SectionHead
          variant="stack"
          title={
            <>
              {t("dial.t1")}
              <br />
              {t("dial.t2")}
            </>
          }
          lede={t("dial.lede")}
        />

        <div className="sheet mt-14 overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 py-6">
            <label htmlFor="landing-tau" className="label text-muted">
              {t("dial.threshold")}
            </label>
            <input
              id="landing-tau"
              type="range"
              min={0.5}
              max={0.99}
              step={0.01}
              value={tau}
              onChange={(e) => setTau(parseFloat(e.target.value))}
              className="tau w-40 sm:w-56 md:w-72"
              style={{ ["--fill" as string]: `${fill}%` }}
              aria-valuetext={tau.toFixed(2)}
            />
            <span className="tnum text-[34px]">{tau.toFixed(2)}</span>
            <span className="ml-auto flex items-center gap-4 text-[12px]">
              {(["auto", "review", "scam"] as Lane[]).map((l) => (
                <span key={l} className="inline-flex items-center gap-1.5" style={{ color: `var(--on-${l})` }}>
                  <LaneIcon icon={LANE_META[l].icon} size={11} />
                  <span className="index">{counts[l]}</span>
                  {t(`lane.${l}.short`)}
                </span>
              ))}
            </span>
          </div>

          <ul className="space-y-1 px-2 pb-2">
            {rows.map((r, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface2/60 px-5 py-4"
              >
                <span
                  className="label inline-flex shrink-0 items-center gap-1.5"
                  style={{ color: `var(--on-${r.lane})` }}
                >
                  <LaneIcon icon={LANE_META[r.lane].icon} size={10} />
                  {t(`lane.${r.lane}.short`)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink/85">{r.text}</span>
                <span className="index shrink-0 text-[11px] text-muted">
                  p {r.signals.top_prob.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <p className="max-w-xl text-[12.5px] leading-relaxed text-muted">
            {t("dial.illustration")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mr-1 text-muted">{t("dial.classes")}</span>
            {CLASSES.map((c) => (
              <ClassChip key={c} classKey={c} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

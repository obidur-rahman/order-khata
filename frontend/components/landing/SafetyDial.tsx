"use client";
/** The safety dial — an interactive picture of the routing policy, using the
 * SAME route() the server uses on hand-authored example signals. No network,
 * no database writes. Clearly labelled as illustrative. */
import { useMemo, useState } from "react";

import { ClassChip } from "@/components/ClassChip";
import { LaneIcon } from "@/components/LaneChip";
import { LANE_META } from "@/lib/brand";
import { usePrefs } from "@/lib/prefs";
import { route, type RouteSignals } from "@/lib/route";
import type { Lane } from "@/lib/types";
import { SectionHead } from "./parts";

interface Sample {
  text: string;
  signals: RouteSignals;
}

const SAMPLES: Sample[] = [
  {
    text: "ei saree ta ki stock e ache? ami nite chai",
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

  return (
    <section className="bg-contrast px-6 py-28 text-oncontrast md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <SectionHead
          tone="contrast"
          title={
            <>
              {t("dial.t1")}
              <br />
              {t("dial.t2")}
            </>
          }
          lede={t("dial.lede")}
        />

        {/* the dial */}
        <div className="mt-20 rounded-3xl border border-oncontrast/15 bg-oncontrast/[0.05] shadow-lift">
          <div className="flex flex-wrap items-center gap-5 border-b border-oncontrast/15 px-7 py-6">
            <label htmlFor="landing-tau" className="label text-oncontrast/60">
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
              className="tau w-32 sm:w-48 md:w-72"
              aria-valuetext={tau.toFixed(2)}
            />
            <span className="tnum text-2xl text-oncontrast">{tau.toFixed(2)}</span>
            <span className="ml-auto flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.08em]">
              <span style={{ color: "var(--on-auto)" }}>
                {counts.auto} {t("lane.auto.short")}
              </span>
              <span style={{ color: "var(--on-review)" }}>
                {counts.review} {t("lane.review.short")}
              </span>
              <span style={{ color: "var(--on-scam)" }}>
                {counts.scam} {t("lane.scam.short")}
              </span>
            </span>
          </div>

          <ul>
            {rows.map((r, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 border-b border-oncontrast/10 px-7 py-4.5 last:border-b-0"
              >
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em]"
                  style={{
                    borderColor: `var(--on-${r.lane})`,
                    color: `var(--on-${r.lane})`,
                  }}
                >
                  <LaneIcon icon={LANE_META[r.lane].icon} size={11} />
                  {t(`lane.${r.lane}.short`)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-oncontrast/85">{r.text}</span>
                <span className="tnum shrink-0 text-[12px] text-oncontrast/50">
                  p {r.signals.top_prob.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 max-w-3xl text-[13px] leading-relaxed text-oncontrast/45">
          {t("dial.illustration")}
        </p>

        {/* the class ramp, on the dark surface */}
        <div className="mt-12 flex flex-wrap items-center gap-2.5">
          <span className="label mr-1 text-oncontrast/45">{t("dial.classes")}</span>
          {["order", "price_question", "delivery_problem", "complaint", "scam", "other"].map((c) => (
            <ClassChip key={c} classKey={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

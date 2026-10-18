"use client";
/** Rigor teaser: the headline evaluation numbers, read live from /api/eval.
 * Honest by construction — if the evaluation has not run, no numbers are
 * shown. Never a hardcoded or fabricated metric. */
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { loadTau, usePrefs } from "@/lib/prefs";
import type { EvalResponse } from "@/lib/types";
import { Reveal } from "../Reveal";
import { ArrowLink, Section, SectionHead } from "./parts";

function pct(v: number | undefined): string {
  return typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—";
}
function num(v: number | undefined, digits = 3): string {
  return typeof v === "number" ? v.toFixed(digits) : "—";
}

const TONES = [
  "var(--accent)",
  "var(--c-order)",
  "var(--c-price)",
  "var(--c-delivery)",
];

export function Rigor() {
  const { t } = usePrefs();
  const [e, setE] = useState<EvalResponse | null>(null);
  const [tau] = useState(() => loadTau(0.85));

  useEffect(() => {
    let alive = true;
    api
      .evaluation()
      .then((d) => alive && setE(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pending = !e || e.generated_at === null;
  const curve = e?.coverage_curve ?? [];
  const atTau = curve.length
    ? curve.reduce((a, b) => (Math.abs(b.tau - tau) < Math.abs(a.tau - tau) ? b : a))
    : null;

  const stats = [
    { label: "macro-F1 · E3", value: num(e?.systems?.E3?.macro_f1) },
    { label: "accuracy · E3", value: pct(e?.systems?.E3?.accuracy) },
    { label: "ECE · calibrated", value: num(e?.calibration?.ece_after) },
    {
      label: `coverage @ τ ${tau.toFixed(2)}`,
      value: atTau ? pct(atTau.coverage) : "—",
    },
  ];

  return (
    <Section>
      <SectionHead
        title={
          <>
            {t("rigor.t1")}
            <br />
            {t("rigor.t2")}
          </>
        }
        lede={t("rigor.lede")}
      />

      {pending ? (
        <div className="mt-20 rounded-3xl border border-line bg-surface p-9 shadow-soft">
          <p className="label" style={{ color: "var(--accent)" }}>
            {t("rigor.pending")}
          </p>
          <p className="mt-4 max-w-2xl text-[16px] leading-[1.75] text-muted">{t("rigor.pendingBody")}</p>
        </div>
      ) : (
        <div className="mt-20 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="label text-muted">{s.label}</div>
                <div
                  className="tnum mt-4 text-[48px] leading-none"
                  style={{ color: TONES[i % TONES.length] }}
                >
                  {s.value}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-16 flex flex-wrap items-end justify-between gap-6">
        <p className="max-w-3xl text-[14px] leading-relaxed text-muted">
          <span className="label mr-3 text-ink">{t("rigor.systems")}</span>
          B1 TF-IDF · B2 LLM alone · E1 decision model · E2 + agreement · E3 full policy
        </p>
        <ArrowLink href="/evaluation/">{t("rigor.openEval")}</ArrowLink>
      </div>
    </Section>
  );
}

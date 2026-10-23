"use client";
/** Rigor teaser: headline evaluation numbers, read live from /api/eval.
 * Honest by construction — if the evaluation has not run, no numbers are
 * shown. Never a hardcoded or fabricated metric. Soft quiet skin. */
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
    <Section tone="sheet">
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
        <div className="mt-14 rounded-[26px] bg-paper p-8 shadow-soft">
          <p className="label" style={{ color: "var(--mark)" }}>
            {t("rigor.pending")}
          </p>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.75] text-muted">{t("rigor.pendingBody")}</p>
        </div>
      ) : (
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 70}>
              <div className="h-full rounded-[26px] bg-paper p-7 shadow-soft">
                <div className="label text-muted">{s.label}</div>
                <div className="tnum mt-4 text-[44px] text-ink md:text-[48px]">{s.value}</div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
          <span className="label mr-3 text-ink">{t("rigor.systems")}</span>
          B1 TF-IDF · B2 LLM alone · E1 decision model · E2 + agreement · E3 full policy
        </p>
        <ArrowLink href="/evaluation/">{t("rigor.openEval")}</ArrowLink>
      </div>
    </Section>
  );
}

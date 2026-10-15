"use client";
/** Evaluation page (docs/06 §4.5): headline numbers, coverage curve with the
 * current τ, per-class and per-script tables, baselines, OOD, scam metrics,
 * and the mandatory "What this does not show" limitations box. All numbers
 * come from /api/eval (backend/artifacts/eval.json) — never hardcoded. */
import { useEffect, useState } from "react";

import { AppBar } from "@/components/AppBar";
import { CoverageCurve } from "@/components/CoverageCurve";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AlertIcon } from "@/components/icons";
import { CLASS_META } from "@/lib/brand";
import { api, ApiError } from "@/lib/api";
import { loadTau } from "@/lib/store";
import { CLASSES, type EvalResponse } from "@/lib/types";

function pct(v: number | undefined): string {
  return typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—";
}
function num(v: number | undefined, digits = 3): string {
  return typeof v === "number" ? v.toFixed(digits) : "—";
}

const SYSTEM_ROWS: { id: string; label: string }[] = [
  { id: "B1", label: "B1 · TF-IDF + logistic (baseline)" },
  { id: "B2", label: "B2 · LLM alone (zero-shot)" },
  { id: "E1", label: "E1 · Decision model only (calibrated)" },
  { id: "E2", label: "E2 · + LLM agreement rule" },
  { id: "E3", label: "E3 · Full Dokanbox policy" },
];

export default function EvaluationPage() {
  const [evalData, setEvalData] = useState<EvalResponse | null>(null);
  const [missing, setMissing] = useState(false);
  const [tau] = useState(() => loadTau(0.85)); // read-only here; marker follows stored tau

  useEffect(() => {
    let alive = true;
    api
      .evaluation()
      .then((d) => alive && setEvalData(d))
      .catch((e) => {
        if (alive && e instanceof ApiError && e.status === 404) setMissing(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!evalData && !missing) return <LoadingScreen note="Loading evaluation results…" />;

  const e = evalData;
  const pending = !e || e.generated_at === null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-extrabold text-ink">Evaluation</h1>
        <p className="mt-1 text-sm text-muted">
          Every number below is produced offline by <code className="rounded bg-line/60 px-1">ml/05_evaluate.py</code>{" "}
          and served from <code className="rounded bg-line/60 px-1">artifacts/eval.json</code>.
        </p>

        {missing && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-line p-6 text-sm text-muted">
            <p className="font-semibold text-ink">Evaluation file not available yet.</p>
            <p className="mt-1">Run ml/05_evaluate.py to generate it. No numbers are shown because none exist.</p>
          </div>
        )}

        {pending && e && (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm"
            style={{ borderColor: "#F59E0B", background: "rgba(245,158,11,0.10)", color: "#92400E" }} role="status">
            <span className="mt-0.5"><AlertIcon size={14} /></span>
            <span>
              <strong>Not yet evaluated.</strong> ml/05_evaluate.py has not been run — the
              values below are zero placeholders, not results.
            </span>
          </div>
        )}

        {e && (
          <>
            {/* headline numbers */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-[13px] font-semibold text-muted">Macro-F1 (E3)</div>
                <div className="tnum mt-2 text-[40px] leading-none">{num(e.systems?.E3?.macro_f1)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-[13px] font-semibold text-muted">Accuracy (E3)</div>
                <div className="tnum mt-2 text-[40px] leading-none">{pct(e.systems?.E3?.accuracy)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-[13px] font-semibold text-muted">ECE after calibration</div>
                <div className="tnum mt-2 text-[40px] leading-none">{num(e.calibration?.ece_after)}</div>
                <div className="mt-1 text-xs text-muted">before: {num(e.calibration?.ece_before)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-[13px] font-semibold text-muted">Test set</div>
                <div className="tnum mt-2 text-[40px] leading-none">{e.data?.d1_test_n ?? 0}</div>
                <div className="mt-1 text-xs text-muted">D1 held-out messages</div>
              </div>
            </div>

            {/* coverage vs accuracy */}
            <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-ink">Coverage vs accuracy</h2>
                <span className="text-xs text-muted">current τ {tau.toFixed(2)} marked on the curve</span>
              </div>
              <div className="mt-3">
                <CoverageCurve curve={e.coverage_curve ?? []} tau={tau} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Coverage = share of messages routed Auto. Auto accuracy = accuracy on that
                slice only. The rest goes to a human — the system is judged on both numbers,
                not one.
              </p>
            </section>

            {/* systems / baselines table */}
            <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-sm font-bold text-ink">Systems compared</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-4">System</th>
                      <th className="py-2 pr-4 text-right">Accuracy</th>
                      <th className="py-2 text-right">Macro-F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYSTEM_ROWS.map((row) => {
                      const s = e.systems?.[row.id];
                      return (
                        <tr key={row.id} className={`border-b border-line/60 ${row.id === "E3" ? "font-semibold" : ""}`}>
                          <td className="py-2 pr-4">{row.label}</td>
                          <td className="py-2 pr-4 text-right">{pct(s?.accuracy)}</td>
                          <td className="py-2 text-right">{num(s?.macro_f1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* per-class + per-script */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-ink">Per class</h2>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3">Class</th>
                      <th className="py-2 pr-3 text-right">P</th>
                      <th className="py-2 pr-3 text-right">R</th>
                      <th className="py-2 text-right">F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLASSES.map((c) => {
                      const row = e.per_class?.[c];
                      return (
                        <tr key={c} className="border-b border-line/60">
                          <td className="py-2 pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_META[c].color }} aria-hidden />
                              {CLASS_META[c].label}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right">{num(row?.p, 2)}</td>
                          <td className="py-2 pr-3 text-right">{num(row?.r, 2)}</td>
                          <td className="py-2 text-right">{num(row?.f1, 2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-ink">By script &amp; generalization</h2>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3">Slice</th>
                      <th className="py-2 text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["bn", "bl", "en", "mx"].map((s) => (
                      <tr key={s} className="border-b border-line/60">
                        <td className="py-2 pr-3 font-semibold">{s}</td>
                        <td className="py-2 text-right">{pct(e.per_script?.[s]?.accuracy)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-line/60">
                      <td className="py-2 pr-3">in-distribution (D1 test)</td>
                      <td className="py-2 text-right">{pct(e.systems?.E3?.accuracy)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3">out-of-distribution ({e.ood?.dataset ?? "OOD"})</td>
                      <td className="py-2 text-right">{pct(e.ood?.accuracy)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted">
                  Scam detection: precision {num(e.scam?.precision, 2)}, recall {num(e.scam?.recall, 2)},
                  false-alarm rate on shop messages {pct(e.scam?.false_alarm_d1)}.
                </p>
              </section>
            </div>

            {/* limitations (docs/07 §7, verbatim intent) */}
            <section className="mt-6 rounded-2xl border-2 border-ink bg-surface p-5" aria-label="Limitations">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <AlertIcon size={16} /> What this does not show
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
                {(e.limitations ?? []).map((lim) => (
                  <li key={lim}>{lim}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

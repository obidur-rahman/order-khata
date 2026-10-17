"use client";
/** Evaluation page (docs/06 §4.5): headline numbers, coverage curve with the
 * current τ, per-class and per-script tables, baselines, OOD, scam metrics,
 * and the mandatory "What this does not show" limitations box. All numbers
 * come from /api/eval (backend/artifacts/eval.json) — never hardcoded. */
import { useEffect, useState } from "react";

import { AppBar } from "@/components/AppBar";
import { CoverageCurve } from "@/components/CoverageCurve";
import { ErrorScreen } from "@/components/ErrorScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AlertIcon } from "@/components/icons";
import { CLASS_META } from "@/lib/brand";
import { api, ApiError } from "@/lib/api";
import { useHealth } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
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
  { id: "E3", label: "E3 · Full Order Khata policy" },
];

/** Which engine the numbers below describe, against which one is serving.
 *
 * The artifact records the engine of the run that produced it; the deployment's
 * Engine A is switchable (docs/04 §2.1). Mixing the two silently would make a
 * measured number look like it describes a system it was never measured on, so
 * the difference is stated here, from the live `/api/health`. */
function EngineProvenance({ serving }: { serving: string | null }) {
  if (!serving) return null;
  const matches = serving === "tfidf-lr";
  return (
    <div
      className="mt-4 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-soft"
      style={{ borderLeft: "3px solid var(--color-accent)" }}
      role="status"
    >
      <span className="text-ink">
        <strong className="font-semibold">Engine A now serving: </strong>
        <code className="rounded-md border border-line px-1.5 font-mono text-[12px]">{serving}</code>
      </span>{" "}
      <span className="text-muted">
        {matches
          ? "— the same model these numbers were measured on."
          : "— these numbers were measured with Engine A = tfidf-lr, before the Laya checkpoint was adopted. Its own measurement is in docs/04 §2.1 and ml/laya_gate.py; it is not below, because it is not in eval.json."}
      </span>
    </div>
  );
}

function Headline({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="label text-muted">{label}</div>
      <div className="tnum mt-3 text-[40px] leading-none text-ink">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export default function EvaluationPage() {
  const [evalData, setEvalData] = useState<EvalResponse | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [tau] = useState(() => loadTau(0.85)); // read-only here; marker follows stored tau

  useEffect(() => {
    let alive = true;
    api
      .evaluation()
      .then((d) => alive && setEvalData(d))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 404) setMissing(true);
        else setError(e instanceof Error ? e.message : "request failed");
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  const { t: tr } = usePrefs();
  const health = useHealth();

  if (error && !evalData)
    return (
      <ErrorScreen
        detail={error}
        onRetry={() => {
          setError(null);
          setNonce((n) => n + 1);
        }}
      />
    );
  if (!evalData && !missing) return <LoadingScreen note="Loading evaluation results…" />;

  const e = evalData;
  const pending = !e || e.generated_at === null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="label text-muted">{tr("page.evaluation.kicker")}</p>
        <h1 className="masthead mt-3 font-display text-3xl font-extrabold text-ink">
          {tr("nav.evaluation")}
        </h1>
        <p className="text-sm text-muted">
          Every number below comes from one offline run of{" "}
          <code className="rounded-md border border-line bg-surface px-1.5 font-mono text-[12px]">
            ml/notebooks/order_khata_lab.ipynb §8
          </code>{" "}
          and is served from{" "}
          <code className="rounded-md border border-line bg-surface px-1.5 font-mono text-[12px]">artifacts/eval.json</code>.
        </p>

        <EngineProvenance serving={health?.engine ?? null} />

        {missing && (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-6 text-sm text-muted">
            <p className="font-semibold text-ink">Evaluation file not available yet.</p>
            <p className="mt-1">
              Run the notebook to generate it. No numbers are shown because none exist.
            </p>
          </div>
        )}

        {pending && e && (
          <div
            className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm shadow-soft"
            style={{ borderLeft: "3px solid var(--color-accent)" }}
            role="status"
          >
            <span className="mt-0.5 text-accent">
              <AlertIcon size={14} />
            </span>
            <span className="text-ink">
              <strong className="font-semibold">Not yet evaluated.</strong>{" "}
              <span className="text-muted">
                The notebook&apos;s evaluation section has not been run. The values below are
                zero placeholders, not results.
              </span>
            </span>
          </div>
        )}

        {e && (
          <>
            {/* headline numbers */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Headline label="Macro-F1 (E3)" value={num(e.systems?.E3?.macro_f1)} />
              <Headline label="Accuracy (E3)" value={pct(e.systems?.E3?.accuracy)} />
              <Headline
                label="ECE after calibration"
                value={num(e.calibration?.ece_after)}
                hint={`before: ${num(e.calibration?.ece_before)}`}
              />
              <Headline
                label="Test set"
                value={String(e.data?.d1_test_n ?? 0)}
                hint="D1 held-out messages"
              />
            </div>

            {/* coverage vs accuracy */}
            <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="label text-muted">Coverage vs accuracy</h2>
                <span className="index text-[10px] text-muted">τ {tau.toFixed(2)} marked</span>
              </div>
              {/* legend lives in the markup, not inside the plot: drawn in the
                  SVG it sat on top of the curves (user brief) */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted">
                <span className="label flex items-center gap-2">
                  <span className="w-4 border-t-2 border-ink" aria-hidden />
                  coverage (auto %)
                </span>
                <span className="label flex items-center gap-2">
                  <span className="w-4 border-t-2 border-dashed border-accent" aria-hidden />
                  auto accuracy
                </span>
              </div>
              <div className="mt-4">
                <CoverageCurve curve={e.coverage_curve ?? []} tau={tau} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Coverage = share of messages routed Auto. Auto accuracy = accuracy on that slice
                only. The rest goes to a human. The system is judged on both numbers, not one.
              </p>
            </section>

            {/* systems / baselines table */}
            <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <h2 className="label text-muted">Systems compared</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="label py-2 pr-4 text-muted">System</th>
                      <th className="label py-2 pr-4 text-right text-muted">Accuracy</th>
                      <th className="label py-2 text-right text-muted">Macro-F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYSTEM_ROWS.map((row) => {
                      const s = e.systems?.[row.id];
                      return (
                        <tr key={row.id} className={`border-b border-line ${row.id === "E3" ? "font-semibold" : ""}`}>
                          <td className="py-2.5 pr-4">{row.label}</td>
                          <td className="py-2.5 pr-4 text-right">{pct(s?.accuracy)}</td>
                          <td className="py-2.5 text-right">{num(s?.macro_f1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* per-class + per-script */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
                <h2 className="label text-muted">Per class</h2>
                <table className="mt-4 w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="label py-2 pr-3 text-muted">Class</th>
                      <th className="label py-2 pr-3 text-right text-muted">P</th>
                      <th className="label py-2 pr-3 text-right text-muted">R</th>
                      <th className="label py-2 text-right text-muted">F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLASSES.map((c) => {
                      const row = e.per_class?.[c];
                      return (
                        <tr key={c} className="border-b border-line">
                          <td className="py-2.5 pr-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_META[c].color }} aria-hidden />
                              {CLASS_META[c].label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-right">{num(row?.p, 2)}</td>
                          <td className="py-2.5 pr-3 text-right">{num(row?.r, 2)}</td>
                          <td className="py-2.5 text-right">{num(row?.f1, 2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
                <h2 className="label text-muted">By script &amp; generalization</h2>
                <table className="mt-4 w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="label py-2 pr-3 text-muted">Slice</th>
                      <th className="label py-2 text-right text-muted">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["bn", "bl", "en", "mx"].map((s) => (
                      <tr key={s} className="border-b border-line">
                        <td className="py-2.5 pr-3 font-mono text-[12px] font-medium">{s}</td>
                        <td className="py-2.5 text-right">{pct(e.per_script?.[s]?.accuracy)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-line">
                      <td className="py-2.5 pr-3">in-distribution (D1 test)</td>
                      <td className="py-2.5 text-right">{pct(e.systems?.E3?.accuracy)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3">out-of-distribution ({e.ood?.dataset ?? "OOD"})</td>
                      <td className="py-2.5 text-right">{pct(e.ood?.accuracy)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted">
                  Scam detection: precision {num(e.scam?.precision, 2)}, recall{" "}
                  {num(e.scam?.recall, 2)}, false-alarm rate on shop messages{" "}
                  {pct(e.scam?.false_alarm_d1)}.
                </p>
              </section>
            </div>

            {/* limitations (docs/07 §7, verbatim intent) */}
            <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-soft" aria-label="Limitations">
              <p className="label flex items-center gap-2 text-accent">
                <AlertIcon size={13} /> What this does not show
              </p>
              <ul className="mt-4 space-y-2.5">
                {(e.limitations ?? []).map((lim) => (
                  <li key={lim} className="flex gap-3 text-sm leading-relaxed text-ink">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line" aria-hidden />
                    {lim}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

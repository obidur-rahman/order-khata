"use client";
/** Try It (docs/06 §4.3): paste a message, classify live, show the AI panel,
 * add it to the inbox, and watch the lane move with the slider. */
import { useState } from "react";

import { AIPanel } from "@/components/AIPanel";
import { AppBar } from "@/components/AppBar";
import { ClassChip } from "@/components/ClassChip";
import { EmptyState } from "@/components/EmptyState";
import { LaneChip } from "@/components/LaneChip";
import { ThresholdSlider } from "@/components/ThresholdSlider";
import { ArrowRightIcon } from "@/components/icons";
import { api, isWarming } from "@/lib/api";
import { useConfig, useHealth } from "@/lib/hooks";
import { loadTau, saveTau, usePrefs } from "@/lib/prefs";
import { TAU_MAX, TAU_MIN, requiredThreshold, route } from "@/lib/route";
import type { Lane, MessageRecord } from "@/lib/types";

const EXAMPLES: { label: string; script: string; text: string }[] = [
  { label: "Banglish order", script: "bl", text: "ei saree ta ki stock e ache? ami nite chai" },
  { label: "Banglish price", script: "bl", text: "koto taka eta? discount possible?" },
  { label: "Bangla price", script: "bn", text: "সারির দাম কত? ডিসকাউন্ট আছে?" },
  { label: "Bangla delivery", script: "bn", text: "আমার অর্ডারটা কখন ডেলিভার হবে?" },
  { label: "English delivery", script: "en", text: "Do you deliver to Chattogram? How long does it take?" },
  { label: "Scam-like", script: "en", text: "Send the OTP to verify your account and click this link to claim your prize" },
];

export default function TryPage() {
  const config = useConfig();
  const health = useHealth();
  const { t: tr } = usePrefs();
  const [text, setText] = useState("");
  const [tau, setTau] = useState(() => loadTau(0.85));
  const [result, setResult] = useState<MessageRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const degraded = health !== null && health.llm_status !== "ok";

  const onTau = (v: number) => {
    setTau(v);
    saveTau(v);
  };

  const classify = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const rec = await api.classify({ text: text.trim(), sender_name: "You (demo)" });
      setResult(rec);
    } catch (e) {
      if (isWarming(e)) setError("Backend is warming up. Try again in a few seconds.");
      else setError(e instanceof Error ? e.message : "classify failed");
    } finally {
      setBusy(false);
    }
  };

  const lane: Lane | null = result
    ? route(
        {
          top_class: result.prediction.top_class,
          top_prob: result.prediction.top_prob,
          scam_prob: result.prediction.scam_prob,
          escalate_prob: result.prediction.escalate_prob,
          llm_class: result.prediction.llm_class,
          llm_status: result.prediction.llm_status,
        },
        tau,
      )[0]
    : null;
  const required = result
    ? requiredThreshold(result.prediction.top_class, tau, degraded)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar>
        <ThresholdSlider
          value={tau}
          min={config?.tau_min ?? TAU_MIN}
          max={config?.tau_max ?? TAU_MAX}
          onChange={onTau}
        />
      </AppBar>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="label text-muted">{tr("page.try.kicker")}</p>
        <h1 className="display mt-2 text-[38px] text-ink">
          {tr("page.try.title")}
        </h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-muted">
          Paste any message in Bangla, Banglish or English. It is classified live, then it
          appears in the inbox.
        </p>

        {/* example chips */}
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setText(ex.text)}
              className="rounded-full bg-surface px-3.5 py-1.5 text-[12px] font-medium text-muted shadow-soft transition hover:-translate-y-0.5 hover:text-ink hover:shadow-lift"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="এখানে মেসেজ পেস্ট করুন / paste a message…"
          className="msg-text mt-5 w-full resize-y border-0 bg-surface px-5 py-4 text-ink shadow-soft placeholder:text-muted"
          style={{ borderRadius: "var(--radius-xl)" }}
          aria-label="Message to classify"
        />
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={classify}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-3 rounded-full bg-btn px-7 py-3.5 text-[13px] font-medium text-btn-ink shadow-lift transition hover:opacity-85 disabled:opacity-40"
          >
            {busy ? "Classifying…" : "Classify"}
            <ArrowRightIcon size={15} />
          </button>
          <span className="index text-[11px] text-muted">{text.length}/1000</span>
        </div>
        {error && (
          <p
            className="mt-3 px-4 py-2.5 text-sm text-ink"
            style={{ background: "var(--scam-tint)", borderRadius: "var(--radius-lg)" }}
            role="alert"
          >
            {error}
          </p>
        )}

        {/* result */}
        {result && lane && (
          <div className="fade-up sheet mt-8 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <ClassChip classKey={result.prediction.top_class} large />
              <LaneChip lane={lane} filled />
              <span className="index ml-auto text-[11px] text-muted">
                needs ≥ {required.toFixed(2)} · p {result.prediction.top_prob.toFixed(2)}
              </span>
            </div>

            <p className="msg-text mt-4 rounded-2xl bg-surface2/60 p-4 text-ink">
              {result.text}
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <AIPanel pred={result.prediction} tau={tau} degraded={degraded} />
              <div className="space-y-4 border-t border-line pt-3 md:border-t-0 md:pt-0">
                <p className="text-[13px] leading-relaxed text-muted">
                  The message is now in the inbox. Drag the threshold slider (top) and watch the
                  lane above change. No network round-trip.
                </p>
                <a
                  href="/inbox/"
                  className="inline-flex items-center gap-2.5 rounded-full bg-btn px-5 py-2.5 text-[12.5px] font-medium text-btn-ink transition hover:opacity-85"
                >
                  Open the inbox <ArrowRightIcon size={14} />
                </a>
                <p className="index text-[10.5px] text-muted">
                  script {result.script} · {result.prediction.engine} · {result.prediction.latency_ms} ms
                </p>
              </div>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="mt-10">
            <EmptyState
              title="No result yet"
              hint="Pick an example chip or write your own. The classifier runs on the server in one pass."
            />
          </div>
        )}
      </main>
    </div>
  );
}

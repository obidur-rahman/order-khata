"use client";
/** Try It (docs/06 §4.3): paste a message, classify live, show the AI panel,
 * add to the inbox, and watch the lane move with the slider. */
import { useState } from "react";

import { AIPanel } from "@/components/AIPanel";
import { AppBar } from "@/components/AppBar";
import { ClassChip } from "@/components/ClassChip";
import { EmptyState } from "@/components/EmptyState";
import { ThresholdSlider } from "@/components/ThresholdSlider";
import { ArrowRightIcon, CheckIcon, EyeIcon, ShieldIcon } from "@/components/icons";
import { LANE_META } from "@/lib/brand";
import { api, isWarming } from "@/lib/api";
import { useConfig, useHealth } from "@/lib/hooks";
import { requiredThreshold, route } from "@/lib/route";
import { broadcastTau, loadTau, saveTau } from "@/lib/store";
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
  const [text, setText] = useState("");
  const [tau, setTau] = useState(() => loadTau(0.85));
  const [result, setResult] = useState<MessageRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const degraded = health !== null && health.llm_status !== "ok";

  const onTau = (v: number) => {
    setTau(v);
    saveTau(v);
    broadcastTau(v);
  };

  const classify = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const rec = await api.classify({ text: text.trim(), sender_name: "You (demo)" });
      setResult(rec);
    } catch (e) {
      if (isWarming(e)) setError("Backend is warming up — try again in a few seconds.");
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
          min={config?.tau_min ?? 0.5}
          max={config?.tau_max ?? 0.99}
          counts={{ auto: 0, review: 0, scam: 0 }}
          onChange={onTau}
        />
      </AppBar>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="masthead font-display text-3xl font-extrabold text-ink">Try It</h1>
        <p className="mt-1 text-sm text-muted">
          Paste any message in Bangla, Banglish or English. Classified live — then it
          appears in the inbox.
        </p>

        {/* example chips (two per script) */}
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setText(ex.text)}
              className=" border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-ink hover:text-ink"
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
          className="mt-4 w-full resize-y  border border-line bg-surface p-4 msg-text text-ink placeholder:text-muted"
          aria-label="Message to classify"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={classify}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-2  bg-ink px-6 py-3 text-[15px] font-bold text-paper transition hover:opacity-85 disabled:opacity-40"
          >
            {busy ? "Classifying…" : "Classify"} <ArrowRightIcon />
          </button>
          <span className="text-xs text-muted">{text.length}/1000</span>
        </div>
        {error && (
          <p className="mt-3  border px-3 py-2 text-sm" style={{ borderColor: "#E5252A", color: "#E5252A" }} role="alert">
            {error}
          </p>
        )}

        {/* result */}
        {result && lane && (
          <div className="fade-up mt-8  border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <ClassChip classKey={result.prediction.top_class} large />
              <span
                className="inline-flex items-center gap-1.5  px-3 py-1 text-sm font-bold text-white"
                style={{ background: LANE_META[lane].deep }}
              >
                {lane === "auto" ? <CheckIcon size={13} /> : lane === "review" ? <EyeIcon size={13} /> : <ShieldIcon size={13} />}
                {LANE_META[lane].label}
              </span>
              <span className="tnum ml-auto text-sm text-muted">
                needs ≥ {required.toFixed(2)} · p {result.prediction.top_prob.toFixed(2)}
              </span>
            </div>

            <p className="mt-4  bg-paper p-3 msg-text text-ink">{result.text}</p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <AIPanel pred={result.prediction} tau={tau} degraded={degraded} />
              <div className="space-y-3 text-sm text-muted">
                <p>
                  The message is now in the inbox. Drag the threshold slider (top) and
                  watch the lane above change — no network round-trip.
                </p>
                <a
                  href="/inbox/"
                  className="inline-flex items-center gap-2  bg-brand px-4 py-2 text-sm font-bold text-ink transition hover:bg-brand-deep active:scale-[0.98]"
                >
                  Open the inbox <ArrowRightIcon size={14} />
                </a>
                <p className="text-xs">
                  script <span className="font-semibold text-ink">{result.script}</span> ·
                  engine <span className="font-semibold text-ink">{result.prediction.engine}</span> ·
                  {result.prediction.latency_ms} ms
                </p>
              </div>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="mt-10  border border-dashed border-line">
            <EmptyState
              title="No result yet"
              hint="Pick an example chip or write your own — the classifier runs on the server in one pass."
            />
          </div>
        )}
      </main>
    </div>
  );
}

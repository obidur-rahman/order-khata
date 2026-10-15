import Link from "next/link";

import { ArrowRightIcon, CheckIcon, EyeIcon, AlertIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/Logo";
import { LANE_META, type LaneMeta } from "@/lib/brand";
import type { Lane } from "@/lib/types";

/**
 * Landing page: tells the Dokanbox story end to end.
 *
 * Structure (docs/06 §4.1 + 07):
 *   1. Masthead + eyebrow
 *   2. Hero: problem > solution > how it works (3 steps)
 *   3. The pipeline, vertically: what runs server-side in Python (unseen)
 *   4. What you see on the inbox: lanes, threshold, second opinion
 *   5. Limitations + honest data provenance (docs/07)
 *   6. Footer with credits
 *
 * Design commitments carried from the rest of the UI:
 *   - sharp, flat corners (no rounded edges)
 *   - ink + brand yellow on warm paper, grayscale luminance where refs demand it
 *   - text always accompanies colour — never colour alone
 */

const STEPS = [
  {
    n: "01",
    title: "A customer message arrives",
    body: "Every message comes to the Page inbox in Bangla, Banglish or English. Some are plain, some are urgent, a few are trying to scam us.",
  },
  {
    n: "02",
    title: "It gets normalized and read",
    body: "The backend normalizes script and route, scores the five classes (Order, Price, Delivery, Complaint, Other), runs a scam guard, and takes a second opinion from the language model.",
  },
  {
    n: "03",
    title: "You get the risky ones",
    body: "Clear, confident messages are auto-handled. Unsure or conflicting ones go to your review queue, where the threshold and a one-line reason are shown.",
  },
];

const PIPELINE = [
  { n: "normalize", label: "Normalize", body: "Detect Bangla / Banglish / English, strip noise, prepare features." },
  { n: "score", label: "Score the 5 classes", body: "Per-class probabilities for Order, Price, Delivery, Complaint, Other." },
  { n: "guard", label: "Scam guard", body: "scam_prob >= SCAM_T (0.50) is never auto — a hard, unit-tested rule." },
  { n: "opinion", label: "Second opinion", body: "LLM disagreement and confidence are routed to review instead of guessing." },
];

const LANE_META_SHORT: Record<Lane, LaneMeta> = {
  auto: LANE_META.auto,
  review: LANE_META.review,
  scam: LANE_META.scam,
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink">
      {/* masthead */}
      <header className="border-b border-line/30 bg-paper/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-display text-xl font-extrabold lowercase tracking-tight text-ink">
              dokanbox
            </span>
          </span>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/inbox/"
              className="rounded-none border border-line/60 px-4 py-2 text-ink transition hover:border-brand hover:text-brand"
            >
              Open the inbox
            </Link>
            <Link
              href="/evaluation/"
              className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4"
            >
              Evaluation &amp; limitations
            </Link>
          </nav>
        </div>
      </header>

      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-paper">
        {/* diagonal asymmetric grid — paper world, sharp corners */}
        <div
          className="pointer-events-none absolute -top-32 -right-40 h-[520px] w-[520px] rotate-[18deg] bg-brand/8"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[360px] w-[420px] rotate-[-14deg] border-[3px] border-brand/40"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6 py-16 md:grid md:grid-cols-[1.4fr_1fr] md:py-24">
          <div>
            <p className="border-b border-line/50 pb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Your shop&apos;s inbox, sorted.
            </p>
            <h1
              className="mt-5 font-display font-extrabold text-ink"
              style={{
                fontSize: "clamp(48px, 8vw, 112px)",
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
              }}
            >
              Sort the noise.
              <br />
              Keep the <span className="text-brand">sale.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
              Every day your customers message you in Bangla, Banglish or English.
              Dokanbox reads them, sorts them, and hands you only the
              conversation that actually needs you.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/inbox/"
                className="inline-flex items-center gap-2 rounded-none border border-line px-6 py-3.5 text-[15px] font-bold text-ink transition hover:border-ink hover:text-ink"
              >
                Open the live inbox <ArrowRightIcon />
              </Link>
              <Link
                href="/evaluation/"
                className="inline-flex items-center gap-2 rounded-none border border-line px-6 py-3.5 text-[15px] font-bold text-ink transition hover:border-brand hover:text-brand"
              >
                See the evaluation &amp; limitations
              </Link>
            </div>

            {/* the three steps of the story */}
            <ol className="mt-10 grid gap-5 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-none border border-line/60 bg-surface p-5">
                  <p className="font-display text-2xl font-extrabold text-brand">{s.n}</p>
                  <h2 className="mt-2 font-display text-lg font-bold text-ink">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* poster card: the three lanes, the hard rule */}
          <div className="mt-10 rounded-none border border-line/20 bg-paper p-6 text-ink md:mt-0 md:p-8">
            <h2 className="font-display text-lg font-bold text-ink">What you see, in three lanes</h2>
            <div className="mt-6 space-y-5">
              {(["auto", "review", "scam"] as Lane[]).map((key) => {
                const m = LANE_META_SHORT[key];
                return (
                  <div key={key} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-line bg-surface text-sm font-bold text-ink"
                      style={{ backgroundColor: m.color }}
                    >
                      {key === "auto" ? <CheckIcon size={15} /> : key === "review" ? <EyeIcon size={15} /> : <AlertIcon size={15} />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{m.label}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {key === "auto"
                          ? "confident and the second opinion agrees — handled, no longer yours."
                          : key === "review"
                            ? "unsure or conflicting — you make the call."
                            : "scammy — the guard is a hard rule, never auto."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-none border border-line/20 bg-surface p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                <AlertIcon size={12} /> the hard rule
              </p>
              <p className="mt-2 text-sm text-ink">
                When <code>scam_prob &gt;= SCAM_T</code>, the lane is never <b>auto</b>.
                The rule is unit-tested and enforced before routing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── pipeline, the server-side story ──────────────────── */}
      <section className="bg-paper px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="border-b border-line/50 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            What runs on the backend
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-ink">
            A pipeline that can never guess its way out of a scam
          </h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
            One container serves the REST API and the static frontend. All
            classification is pure Python — no server-side rendering, no
            extra processes, no secrets in the UI.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            {PIPELINE.map((p) => (
              <div
                key={p.n}
                className="flex-1 rounded-none border border-line/60 bg-surface p-5"
              >
                <p className="font-display text-xl font-bold text-brand">{p.n}</p>
                <h3 className="mt-1 font-display text-base font-bold text-ink">{p.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            Nothing leaves the container. The language model is optional: if no
            provider key is configured, the app degrades to the keyword + guard
            and always works.
          </p>
        </div>
      </section>

      {/* ── limitations / honesty ────────────────────────────── */}
      <section className="bg-ink px-6 py-16 text-paper">
        <div className="mx-auto max-w-6xl">
          <p className="border-b border-line/40 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Honest by design (docs/07)
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-none border border-line/30 bg-paper/5 p-5">
              <h3 className="font-display text-base font-bold text-ink">Data is simulated.</h3>
              <p className="mt-2 text-sm leading-relaxed">
                The messages you classify are a public Bangla e-commerce customer-message
                corpus (derivative of BanglaEComIntent, CC BY-NC-SA 4.0) and a Bengali SMS
                smishing corpus (MIT). This is a demo on a simulated Page feed — not real
                seller messages, and no real customer spoke to the model.
              </p>
            </div>
            <div className="rounded-none border border-line/30 bg-paper/5 p-5">
              <h3 className="font-display text-base font-bold text-ink">No hardcoded numbers.</h3>
              <p className="mt-2 text-sm leading-relaxed">
                Every metric on the Evaluation page comes from
                <code>backend/artifacts/eval.json</code>, written by
                <code>ml/05_evaluate.py</code> at build time. There are no baked-in
                percentages, and none are shown until evaluation runs.
              </p>
            </div>
            <div className="rounded-none border border-line/30 bg-paper/5 p-5 md:col-span-2">
              <h3 className="font-display text-base font-bold text-ink">Known gaps (nothing is hidden).</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-muted">
                <li>The five-class scores are keyword-stub probabilities until the trained Laya checkpoint lands (docs/08 Phase 0).</li>
                <li>Calibration artifacts are pending; the app degrades to identity scaling when they are absent.</li>
                <li>No live Meta integration, no accounts, no reply composer — those are out of scope.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── footer ───────────────────────────────────────────── */}
      <footer className="border-t border-line/30 bg-paper px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-[13px] leading-relaxed text-muted md:flex-row md:justify-between">
          <div className="max-w-2xl space-y-1">
            <p className="font-semibold text-ink">dokanbox — demo uses a simulated Page feed.</p>
            <p>
              Built with Next.js (static export) and FastAPI (Python 3.11) inside one free
              Hugging Face Space. Light mode only, no paid API, no paid hosting.
            </p>
          </div>
          <div className="flex items-end gap-4">
            <Link href="/evaluation/" className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4">
              Evaluation &amp; limitations
            </Link>
            <span className="hidden md:block"><Logo size={24} /></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

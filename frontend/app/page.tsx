import Link from "next/link";

import { ArrowRightIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/Logo";

/** docs/06 §4.1: full-bleed black and yellow, diagonal asymmetric grid, huge
 * headline, two CTAs, three colored feature blocks, honest footer. */

const FEATURES = [
  {
    color: "#2F6BFF",
    title: "Sorts Bangla, Banglish, English",
    body: "Every message gets a class, a calibrated confidence and a one-line reason.",
  },
  {
    color: "#F59E0B",
    title: "Asks a human when unsure",
    body: "Low confidence, conflicting signals or an angry customer? It goes to your review queue.",
  },
  {
    color: "#E5252A",
    title: "Never auto-handles scams",
    body: "A hard rule, unit-tested: scammy messages are always flagged, never sent.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink">
      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* diagonal asymmetric grid */}
        <div
          className="pointer-events-none absolute -top-32 -right-40 h-[520px] w-[520px] rotate-[18deg] rounded-[64px] bg-brand"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[360px] w-[420px] rotate-[-14deg] rounded-[48px] border-[3px] border-brand/60"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <header className="flex items-center justify-between py-6">
            <span className="flex items-center gap-2">
              <LogoMark size={34} />
              <span className="font-display text-xl font-extrabold lowercase tracking-tight text-paper">
                dokanbox
              </span>
            </span>
            <nav className="flex items-center gap-2 text-sm font-semibold text-paper/80">
              <Link href="/evaluation/" className="rounded-full border border-paper/30 px-4 py-2 transition hover:border-brand hover:text-brand">
                See the evaluation
              </Link>
            </nav>
          </header>

          <div className="grid items-start gap-10 py-16 md:grid-cols-[1.4fr_1fr] md:py-24">
            <div>
              <p className="mb-5 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
                Your shop&apos;s inbox, sorted.
              </p>
              <h1
                className="font-display font-extrabold text-paper"
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
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-paper/75">
                Dokanbox reads every customer message in Bangla, Banglish or English,
                sorts it into Order / Price / Delivery / Complaint / Scam / Other, and
                routes the risky ones to you instead of guessing.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/inbox/"
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-[15px] font-bold text-ink transition hover:bg-brand-deep active:scale-[0.98]"
                >
                  Open the live inbox <ArrowRightIcon />
                </Link>
                <Link
                  href="/evaluation/"
                  className="inline-flex items-center gap-2 rounded-full border border-paper/40 px-6 py-3.5 text-[15px] font-bold text-paper transition hover:border-brand hover:text-brand active:scale-[0.98]"
                >
                  See the evaluation
                </Link>
              </div>
            </div>

            {/* poster card */}
            <div className="rounded-3xl border border-paper/15 bg-paper p-5 text-ink shadow-2xl md:mt-8 md:rotate-[1.5deg]">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Needs your eyes</p>
              <p className="mt-2 rounded-xl border-l-4 border-lanereview bg-surface p-3 text-sm">
                “order ta ki ajke pathaite parben? amar toh urgent” — second opinion
                disagrees, sending to a human.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">Handled for you</p>
              <p className="mt-2 rounded-xl border-l-4 border-laneauto bg-surface p-3 text-sm">
                “saree ta ki stock e ache?” — order, 0.93 confident, auto-handled.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">Scam alerts</p>
              <p className="mt-2 rounded-xl border-l-4 border-lanescam bg-surface p-3 text-sm">
                “Send OTP to claim your prize” — never auto-handled. Ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── feature blocks ───────────────────────────────────── */}
      <section className="bg-paper px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl p-6 text-white"
              style={{ background: f.color }}
            >
              <h2 className="font-display text-xl font-bold leading-snug">{f.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/90">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── footer: credits + honesty ────────────────────────── */}
      <footer className="border-t border-line bg-paper px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-[13px] leading-relaxed text-muted md:flex-row md:justify-between">
          <div className="max-w-2xl space-y-1">
            <p className="font-semibold text-ink">dokanbox — demo uses a simulated Page feed.</p>
            <p>
              Data: public Bangla e-commerce customer-message corpus
              (derivative of BanglaEComIntent, CC BY-NC-SA 4.0) and a Bengali SMS
              smishing corpus (MIT). Not real Facebook seller messages.
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

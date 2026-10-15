"use client";
/** Dashboard (docs/06 §4.4): four stat cards, class distribution bar,
 * confidence histogram with threshold line, estimated time saved (labeled
 * with its assumption), recent activity. */
import { useEffect, useMemo, useState } from "react";

import { AppBar } from "@/components/AppBar";
import { ClassChip } from "@/components/ClassChip";
import { Histogram } from "@/components/Histogram";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatCard } from "@/components/StatCard";
import { CLASS_META, fmtTime } from "@/lib/brand";
import { api } from "@/lib/api";
import { useInbox } from "@/lib/hooks";
import { requiredThreshold } from "@/lib/route";
import { loadTau } from "@/lib/store";
import { CLASSES, type StatsResponse } from "@/lib/types";

function fmtDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export default function DashboardPage() {
  const { conversations, warming, error } = useInbox();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [tau] = useState(() => loadTau(0.85)); // read-only here; slider lives in Inbox/Try

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .stats()
        .then((s) => alive && setStats(s))
        .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const requiredAtDefault = useMemo(() => requiredThreshold("order", tau, false), [tau]);

  if (warming && !stats && !error) return <LoadingScreen />;

  const total = stats?.total ?? 0;
  const lanes = stats?.lanes ?? { auto: 0, review: 0, scam: 0 };
  const autoPct = total > 0 ? Math.round((lanes.auto / total) * 100) : 0;
  const recent = conversations.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="masthead font-display text-3xl font-extrabold text-ink">Dashboard</h1>
            <p className="mt-1 text-sm text-muted">
              Current threshold τ = {tau.toFixed(2)} · non-`other` classes need ≥{" "}
              {requiredAtDefault.toFixed(2)}
            </p>
          </div>
          <p className="text-xs text-muted">live from the ephemeral demo database</p>
        </div>

        {/* four big stat cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Messages today" value={total} hint="seed + simulated + pasted" />
          <StatCard
            label="Handled automatically"
            value={`${autoPct}%`}
            hint={`${lanes.auto} of ${total} at τ ${tau.toFixed(2)}`}
            accent="#17A34A"
          />
          <StatCard label="Needs review" value={lanes.review} hint="queued for a human" accent="#B45309" />
          <StatCard label="Scams caught" value={lanes.scam} hint="never auto-handled" accent="#E5252A" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* class distribution */}
          <section className=" border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Class distribution</h2>
            {total === 0 ? (
              <p className="mt-3 text-sm text-muted">No messages yet — paste one in Try It.</p>
            ) : (
              <>
                <div className="mt-4 flex h-5 w-full overflow-hidden " role="img" aria-label="Class distribution bar">
                  {CLASSES.map((c) => {
                    const n = stats?.classes?.[c] ?? 0;
                    if (!n) return null;
                    return (
                      <div
                        key={c}
                        style={{ width: `${(n / total) * 100}%`, background: CLASS_META[c].color }}
                        title={`${CLASS_META[c].label}: ${n}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                  {CLASSES.map((c) => {
                    const n = stats?.classes?.[c] ?? 0;
                    return (
                      <span key={c} className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <span className="h-2.5 w-2.5 " style={{ background: CLASS_META[c].color }} aria-hidden />
                        {CLASS_META[c].label} <span className="tnum font-semibold text-ink">{n}</span>
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* time saved estimate (labeled with assumption, docs/06 §4.4) */}
          <section className=" border border-line bg-surface p-5">
            <h2 className="hl inline text-sm font-bold text-ink">Estimated time saved</h2>
            <p className="tnum mt-3 text-[44px] leading-none text-ink">
              {fmtDuration(stats?.time_saved_s ?? 0)}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Estimate only: messages auto-handled × {stats?.seconds_per_message ?? 20} s
              of manual sorting. Assumes a human would have read each message once —
              it does not measure money or customer outcomes.
            </p>
            <div className="mt-4  bg-paper p-3 text-xs text-muted">
              <span className="font-semibold text-ink">Savings dial:</span> raising τ moves
              messages from Auto to Review — coverage down, accuracy up. That trade-off is
              charted on the <a href="/evaluation/" className="underline decoration-brand decoration-2 underline-offset-2">Evaluation page</a>.
            </div>
          </section>
        </div>

        {/* histogram */}
        <section className="mt-6  border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Confidence histogram</h2>
            <span className="text-xs text-muted">threshold line at τ {tau.toFixed(2)}</span>
          </div>
          <div className="mt-3">
            {stats ? (
              <Histogram bins={stats.histogram} tau={tau} />
            ) : (
              <p className="text-sm text-muted">Loading…</p>
            )}
          </div>
        </section>

        {/* recent activity */}
        <section className="mt-6  border border-line bg-surface p-5">
          <h2 className="text-sm font-bold text-ink">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((c) => {
                const m = c.last_message;
                if (!m) return null;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <ClassChip classKey={m.prediction.top_class} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{m.text}</span>
                    <span className="tnum shrink-0 text-xs text-muted">{fmtTime(m.received_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

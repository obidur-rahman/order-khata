"use client";
/** Dashboard (docs/06 §4.4): four stat cards, class distribution bar,
 * confidence histogram with threshold line, estimated time saved (labeled
 * with its assumption), recent activity. */
import { useEffect, useMemo, useState } from "react";

import { AppBar } from "@/components/AppBar";
import { ClassChip } from "@/components/ClassChip";
import { ErrorScreen } from "@/components/ErrorScreen";
import { Histogram } from "@/components/Histogram";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatCard } from "@/components/StatCard";
import { CLASS_META, fmtTime } from "@/lib/brand";
import { api } from "@/lib/api";
import { useInbox } from "@/lib/hooks";
import { loadTau, usePrefs } from "@/lib/prefs";
import { requiredThreshold } from "@/lib/route";
import { CLASSES, type StatsResponse } from "@/lib/types";

function fmtDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export default function DashboardPage() {
  const { conversations, warming, error, refresh } = useInbox();
  const { t: tr } = usePrefs();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [nonce, setNonce] = useState(0);
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
  }, [nonce]);

  const requiredAtDefault = useMemo(() => requiredThreshold("order", tau, false), [tau]);

  if (warming && !stats && !error) return <LoadingScreen />;
  if (error && !stats)
    return (
      <ErrorScreen
        detail={error}
        onRetry={() => {
          refresh();
          setNonce((n) => n + 1);
        }}
      />
    );

  const total = stats?.total ?? 0;
  const lanes = stats?.lanes ?? { auto: 0, review: 0, scam: 0 };
  const autoPct = total > 0 ? Math.round((lanes.auto / total) * 100) : 0;
  const recent = conversations.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label text-muted">{tr("page.dashboard.kicker")}</p>
            <h1 className="masthead mt-3 font-display text-3xl font-extrabold text-ink">
              {tr("nav.dashboard")}
            </h1>
            <p className="text-sm text-muted">
              Current threshold τ = {tau.toFixed(2)} · non-<code className="font-mono">other</code>{" "}
              classes need ≥ {requiredAtDefault.toFixed(2)}
            </p>
          </div>
          <p className="label text-muted">ephemeral demo database</p>
        </div>

        {/* four big stat cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Messages today" value={total} hint="seed + simulated + pasted" />
          <StatCard
            label="Handled automatically"
            value={`${autoPct}%`}
            hint={`${lanes.auto} of ${total} at τ ${tau.toFixed(2)}`}
          />
          <StatCard
            label="Needs review"
            value={lanes.review}
            hint="queued for a human"
            accent="var(--color-accent)"
          />
          <StatCard
            label="Scams caught"
            value={lanes.scam}
            hint="never auto-handled"
            accent="var(--lane-scam)"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* class distribution */}
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <h2 className="label text-muted">Class distribution</h2>
            {total === 0 ? (
              <p className="mt-3 text-sm text-muted">No messages yet. Paste one in Try It.</p>
            ) : (
              <>
                <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label="Class distribution bar">
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
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_META[c].color }} aria-hidden />
                        {CLASS_META[c].label} <span className="tnum font-bold text-ink">{n}</span>
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* time saved estimate (labeled with assumption, docs/06 §4.4) */}
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <h2 className="label text-muted">Estimated time saved</h2>
            <p className="tnum mt-3 text-[44px] leading-none text-ink">
              {fmtDuration(stats?.time_saved_s ?? 0)}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Estimate only: messages auto-handled × {stats?.seconds_per_message ?? 20} s of
              manual sorting. Assumes a human would have read each message once. It does not
              measure money or customer outcomes.
            </p>
            <div className="mt-4 rounded-xl border border-line bg-paper p-3 text-xs text-muted">
              <span className="font-semibold text-ink">Savings dial:</span> raising τ moves
              messages from Auto to Review: coverage down, accuracy up. That trade-off is
              charted on the{" "}
              <a href="/evaluation/" className="text-ink underline decoration-accent decoration-2 underline-offset-2">
                Evaluation page
              </a>
              .
            </div>
          </section>
        </div>

        {/* histogram */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="label text-muted">Confidence histogram</h2>
            <span className="index text-[10px] text-muted">threshold τ {tau.toFixed(2)}</span>
          </div>
          <div className="mt-4">
            {stats ? <Histogram bins={stats.histogram} tau={tau} /> : <p className="text-sm text-muted">Loading…</p>}
          </div>
        </section>

        {/* recent activity */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <h2 className="label text-muted">Recent activity</h2>
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
                    <span className="index shrink-0 text-[10px] text-muted">{fmtTime(m.received_at)}</span>
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

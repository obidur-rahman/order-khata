"use client";
/** Inbox (docs/06 §4.2): top bar with slider + live counters, lane tabs,
 * conversation list / thread / AI panel. Slider changes recompute lanes
 * client-side via lib/route — zero network (docs/06 §6).
 *
 * The screen is a fixed shell: the bar stays where it is and every pane
 * scrolls on its own, the way a mail client behaves.
 *
 * Breakpoints are pure CSS classes, deliberately. There is no
 * `window.innerWidth` read anywhere in render: a width guess made at render
 * time is wrong on the first frame, never hears a resize, and makes the panes
 * disagree with the hydration pass. Classes do all of it:
 *
 *   < md    one pane at a time (list ↔ thread) + lane bar pinned at the bottom
 *   md–xl   list | thread            — lane tabs above, status at the far right
 *   ≥ xl    list | thread | AI rail  — the detail panel gets its own column
 *
 * Every pane edge, tab and panel is capped at the same 1400px column the top
 * bar uses, so nothing drifts apart on a wide display.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppBar } from "@/components/AppBar";
import { ConversationRow } from "@/components/ConversationRow";
import { DegradedBanner } from "@/components/HealthDot";
import { ErrorScreen } from "@/components/ErrorScreen";
import { LaneTabs, type LaneTab } from "@/components/LaneTabs";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThresholdSlider } from "@/components/ThresholdSlider";
import { ThreadView } from "@/components/ThreadView";
import { AIPanel, signalsOf } from "@/components/AIPanel";
import { EmptyState } from "@/components/EmptyState";
import { EyeIcon, InboxIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { useConfig, useHealth, useInbox } from "@/lib/hooks";
import { loadTau, saveTau, usePrefs } from "@/lib/prefs";
import { TAU_MAX, TAU_MIN, route } from "@/lib/route";
import type { ClassKey, ConversationRecord, Lane } from "@/lib/types";

export default function InboxPage() {
  const config = useConfig();
  const health = useHealth();
  const { t } = usePrefs();
  const { conversations, warming, error, lastSeenId, refresh } = useInbox();

  const [tau, setTau] = useState(() => loadTau(0.85));
  const [tab, setTab] = useState<LaneTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Small screens show one pane at a time; from md up both are always laid
   *  out side by side and this only decides which one a tap reveals first. */
  const [view, setView] = useState<"list" | "thread">("list");
  const [threads, setThreads] = useState<Record<string, ConversationRecord>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const onTau = useCallback((v: number) => {
    setTau(v);
    saveTau(v); // every screen reads the stored value on mount (lib/prefs.ts)
  }, []);

  const degraded = health !== null && health.llm_status !== "ok";

  const rows = useMemo(
    () =>
      conversations
        .filter((c) => c.last_message)
        .map((c) => ({
          conv: c,
          msg: c.last_message!,
          lane: route(signalsOf(c.last_message!.prediction), tau)[0] as Lane,
        })),
    [conversations, tau],
  );

  const counts = useMemo(() => {
    const c = { all: rows.length, auto: 0, review: 0, scam: 0 } as Record<LaneTab, number>;
    rows.forEach((r) => (c[r.lane] += 1));
    return c;
  }, [rows]);

  const visible = useMemo(
    () => rows.filter((r) => tab === "all" || r.lane === tab),
    [rows, tab],
  );

  // active conversation: the explicit choice, else the top of the lane, else
  // the newest (derived — no effect, so nothing cascades on the first paint)
  const activeId = selectedId ?? visible[0]?.conv.id ?? rows[0]?.conv.id ?? null;

  // thread source: cached full thread if present, else a one-message preview
  const selectedConv = useMemo(() => {
    if (!activeId) return null;
    const full = threads[activeId];
    if (full) return full;
    const preview = conversations.find((c) => c.id === activeId);
    return preview?.last_message ? { ...preview, messages: [preview.last_message!] } : null;
  }, [activeId, threads, conversations]);

  // The rail and the thread both report on the newest message.
  const activePred = useMemo(() => {
    if (!selectedConv) return null;
    const msgs = selectedConv.messages.filter(Boolean);
    return (msgs[msgs.length - 1] ?? selectedConv.last_message)?.prediction ?? null;
  }, [selectedConv]);

  // fetch the full thread when the cache misses the newest polled message
  useEffect(() => {
    if (!activeId) return;
    const newestId = conversations.find((c) => c.id === activeId)?.last_message?.id;
    const full = threads[activeId];
    if (full && newestId && full.messages.some((m) => m.id === newestId)) return;
    let alive = true;
    api
      .conversation(activeId)
      .then((rec) => alive && setThreads((t) => ({ ...t, [activeId]: rec })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeId, conversations, threads]);

  /** Switching lanes moves the reader to the top of the new lane instead of
   *  leaving a thread open that the list no longer shows. */
  const onTab = useCallback(
    (next: LaneTab) => {
      setTab(next);
      const first = rows.find((r) => next === "all" || r.lane === next);
      setSelectedId(first ? first.conv.id : null);
    },
    [rows],
  );

  const onResolve = useCallback(
    async (messageId: string, label: ClassKey) => {
      setBusyId(messageId);
      setResolveError(null);
      // optimistic (docs/06 §6)
      setThreads((t) => {
        const next = { ...t };
        const conv = next[activeId!];
        if (conv) {
          next[activeId!] = {
            ...conv,
            messages: conv.messages.map((m) =>
              m.id === messageId
                ? { ...m, resolution: { human_label: label, resolved_at: new Date().toISOString() } }
                : m,
            ),
          };
        }
        return next;
      });
      try {
        const updated = await api.resolve(messageId, label);
        setThreads((t) => {
          const next = { ...t };
          const conv = next[updated.conversation_id];
          if (conv) {
            next[updated.conversation_id] = {
              ...conv,
              messages: conv.messages.map((m) => (m.id === messageId ? updated : m)),
            };
          }
          return next;
        });
        refresh();
      } catch (e) {
        setResolveError(e instanceof Error ? e.message : "resolve failed");
      } finally {
        setBusyId(null);
      }
    },
    [activeId, refresh],
  );

  if (warming && !error) return <LoadingScreen />;
  if (error && rows.length === 0) return <ErrorScreen detail={error} onRetry={refresh} />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <AppBar>
        <ThresholdSlider
          value={tau}
          min={config?.tau_min ?? TAU_MIN}
          max={config?.tau_max ?? TAU_MAX}
          counts={{ auto: counts.auto, review: counts.review, scam: counts.scam }}
          onChange={onTau}
        />
      </AppBar>

      {/* Lane tabs + engine status share one strip from md up (docs/06 §4.2);
          on phones the lanes move to the bottom bar instead. */}
      <div className="hidden shrink-0 border-b border-line bg-surface md:block">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <LaneTabs active={tab} counts={counts} onSelect={onTab} />
          {degraded && (
            <div className="ml-auto">
              <DegradedBanner />
            </div>
          )}
        </div>
      </div>
      {degraded && (
        <div className="shrink-0 border-b border-line bg-surface px-3 py-2 md:hidden">
          <DegradedBanner />
        </div>
      )}

      {/* ── panes ─────────────────────────────────────────────────────────
          One scroll container each, never the page: the shell is exactly
          h-dvh, so a long conversation list cannot push the thread off the
          screen the way a document-flow column does. */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1">
        {/* conversation list: the whole pane on a phone, a fixed column above */}
        <aside
          className={`${
            view === "thread" ? "hidden md:flex" : "flex"
          } min-h-0 w-full flex-col overflow-y-auto overscroll-contain border-line md:w-[336px] md:shrink-0 md:border-r xl:w-[376px]`}
          aria-label={t("inbox.conversations")}
        >
          {visible.length === 0 ? (
            <EmptyState
              title="Nothing in this lane"
              hint="Messages appear here as they are classified, or paste one in Try It."
              icon={<InboxIcon size={20} />}
            />
          ) : (
            <ul role="list">
              {visible.map(({ conv, msg, lane }) => (
                <li key={conv.id}>
                  <ConversationRow
                    conv={conv}
                    msg={msg}
                    lane={lane}
                    active={conv.id === activeId}
                    isNew={msg.id === lastSeenId}
                    onSelect={() => {
                      setSelectedId(conv.id);
                      setView("thread");
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* thread */}
        <section
          className={`${
            view === "list" ? "hidden md:flex" : "flex"
          } min-h-0 min-w-0 flex-1 flex-col bg-paper`}
          aria-label={t("inbox.thread")}
        >
          {selectedConv && selectedConv.messages.length > 0 ? (
            <ThreadView
              conv={selectedConv}
              tau={tau}
              degraded={degraded}
              isNewId={lastSeenId}
              busyId={busyId}
              resolveError={resolveError}
              onResolve={onResolve}
              onBack={() => setView("list")}
              rail
            />
          ) : (
            <EmptyState
              title="Pick a conversation"
              hint="Or open Try It and paste your own message. It lands right here."
              icon={<EyeIcon size={20} />}
            />
          )}
        </section>

        {/* AI detail rail: its own column once there is room for three (xl+).
            Below that the same panel lives inline in the thread's bottom deck
            (ThreadView), so the two never both render. */}
        {selectedConv && activePred && (
          <aside
            className="hidden w-[340px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l border-line bg-surface xl:flex"
            aria-label={t("inbox.messageDetails")}
          >
            <div className="border-b border-line px-4 py-3">
              <p className="label text-muted">{t("inbox.messageDetails")}</p>
            </div>
            <div className="px-4 py-4">
              <AIPanel pred={activePred} tau={tau} degraded={degraded} />
            </div>
          </aside>
        )}
      </div>

      {/* ── phones: lanes as a bottom bar (docs/06 §6), and only while the
          list is on screen — inside a thread the back arrow owns that edge. */}
      {view === "list" && (
        <div className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          <LaneTabs active={tab} counts={counts} onSelect={onTab} variant="bar" />
        </div>
      )}
    </div>
  );
}

"use client";
/** Inbox (docs/06 §4.2): top bar with slider + live counters, lane tabs,
 * conversation list / thread / AI panel. Slider changes recompute lanes
 * client-side via lib/route — zero network (docs/06 §6). */
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppBar } from "@/components/AppBar";
import { ConversationRow } from "@/components/ConversationRow";
import { DegradedBanner } from "@/components/HealthDot";
import { LaneTabs, type LaneTab } from "@/components/LaneTabs";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThresholdSlider } from "@/components/ThresholdSlider";
import { ThreadView } from "@/components/ThreadView";
import { AIPanel, signalsOf } from "@/components/AIPanel";
import { EmptyState } from "@/components/EmptyState";
import { EyeIcon, InboxIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { useConfig, useHealth, useInbox } from "@/lib/hooks";
import { route } from "@/lib/route";
import { broadcastTau, loadTau, saveTau } from "@/lib/store";
import type { ClassKey, ConversationRecord, Lane } from "@/lib/types";

export default function InboxPage() {
  const config = useConfig();
  const health = useHealth();
  const { conversations, warming, error, lastSeenId, refresh } = useInbox();

  const [tau, setTau] = useState(() => loadTau(0.85));
  const [tab, setTab] = useState<LaneTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ConversationRecord>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const onTau = useCallback((v: number) => {
    setTau(v);
    saveTau(v);
    broadcastTau(v);
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

  const visible = rows.filter((r) => tab === "all" || r.lane === tab);

  // active conversation: explicit choice, else the newest (derived — no effect)
  const activeId = selectedId ?? rows[0]?.conv.id ?? null;

  // thread source: cached full thread if present, else a one-message preview
  const selectedConv = useMemo(() => {
    if (!activeId) return null;
    const full = threads[activeId];
    if (full) return full;
    const preview = conversations.find((c) => c.id === activeId);
    return preview?.last_message ? { ...preview, messages: [preview.last_message!] } : null;
  }, [activeId, threads, conversations]);

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
        setResolveError(e instanceof Error ? e.message : "resolve failed");    } finally {
      setBusyId(null);
    }
  },
    [activeId, refresh],
  );

  if (warming && !error) return <LoadingScreen note={error ?? undefined} />;
  if (error && rows.length === 0)
    return <LoadingScreen note={`Cannot reach the backend: ${error}`} />;

  const selectedRow = activeId ? rows.find((r) => r.conv.id === activeId) : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppBar>
        <ThresholdSlider
          value={tau}
          min={config?.tau_min ?? 0.5}
          max={config?.tau_max ?? 0.99}
          counts={{ auto: counts.auto, review: counts.review, scam: counts.scam }}
          onChange={onTau}
        />
      </AppBar>

      <div className="mx-auto w-full max-w-7xl px-3 pb-4">
        <div className="py-3">
          <LaneTabs active={tab} counts={counts} onSelect={setTab} />
        </div>
        {degraded && (
          <div className="mb-3">
            <DegradedBanner />
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {/* list */}
          <aside className="w-full shrink-0 overflow-hidden  border border-line bg-surface lg:w-[320px]">
            <div className="max-h-[36vh] overflow-y-auto lg:max-h-[calc(100vh-220px)]">
              {visible.length === 0 ? (
                <EmptyState
                  title="Nothing in this lane"
                  hint="Messages appear here as they are classified — or paste one in Try It."
                  icon={<InboxIcon size={20} />}
                />
              ) : (
                visible.map(({ conv, msg, lane }) => (
                  <ConversationRow
                    key={conv.id}
                    conv={conv}
                    msg={msg}
                    lane={lane}
                    active={conv.id === activeId}
                    isNew={msg.id === lastSeenId}
                    onSelect={() => setSelectedId(conv.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* thread */}
          <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden  border border-line bg-surface">
            {selectedConv && selectedConv.messages.length > 0 ? (
              <ThreadView
                conv={selectedConv}
                tau={tau}
                degraded={degraded}
                isNewId={lastSeenId}
                busyId={busyId}
                resolveError={resolveError}
                onResolve={onResolve}
              />
            ) : (
              <EmptyState
                title="Pick a conversation"
                hint="Or open Try It and paste your own message — it lands right here."
                icon={<EyeIcon size={20} />}
              />
            )}
          </section>

          {/* AI panel (desktop) */}
          <aside className="hidden w-[340px] shrink-0  border border-line bg-surface p-4 lg:block">
            {selectedRow && selectedRow.msg ? (
              <AIPanel pred={selectedRow.msg.prediction} tau={tau} degraded={degraded} />
            ) : (
              <EmptyState title="No message selected" hint="Select a conversation to see its signals." />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

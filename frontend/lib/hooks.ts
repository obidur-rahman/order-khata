"use client";
/** Polling hooks (docs/06 §6): inbox polls every 2 s and pauses when the tab
 * is hidden; health polls every 5 s. All network I/O goes through lib/api. */
import { useCallback, useEffect, useRef, useState } from "react";

import { api, isWarming } from "./api";
import type { ConfigResponse, ConversationRecord, HealthResponse } from "./types";

const POLL_MS = 2000;
const HEALTH_MS = 5000;

export function useConfig() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .config()
      .then((c) => alive && setConfig(c))
      .catch(() => alive && setConfig(null));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const h = await api.health();
        if (alive) setHealth(h);
      } catch {
        if (alive) setHealth(null);
      }
      timer = setTimeout(tick, HEALTH_MS);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  return health;
}

export interface InboxState {
  conversations: ConversationRecord[];
  warming: boolean;
  error: string | null;
  /** Last time a new message id appeared (drives the enter animation). */
  lastSeenId: string | null;
  refresh: () => void;
}

export function useInbox(): InboxState {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [warming, setWarming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) {
        // paused while hidden (docs/06 §6) — schedule only, no network
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      try {
        const data = await api.inbox({ limit: 200 });
        if (alive) {
          setConversations(data);
          setWarming(false);
          setError(null);
          const newest = data[0]?.last_message?.id ?? null;
          if (newest && !knownIds.current.has(newest)) {
            data.forEach((c) => c.last_message && knownIds.current.add(c.last_message.id));
            setLastSeenId(newest);
          }
        }
      } catch (e) {
        if (!alive) return;
        if (isWarming(e)) setWarming(true);
        else setError(e instanceof Error ? e.message : "request failed");
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [nonce]);

  return { conversations, warming, error, lastSeenId, refresh };
}

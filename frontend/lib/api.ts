/** The ONLY module that talks to the backend (docs/05 frontend contract). */
import type {
  ClassKey,
  ConfigResponse,
  ConversationRecord,
  EngineSwitchResponse,
  EvalResponse,
  HealthResponse,
  MessageRecord,
  StatsResponse,
} from "./types";

// Same origin in production (FastAPI serves out/); override for dev proxying.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`${status}: ${detail}`);
    this.name = "ApiError";
  }
}

export function isWarming(e: unknown): boolean {
  return e instanceof ApiError && e.status === 503;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export interface InboxQuery {
  lane?: "auto" | "review" | "scam" | "all";
  limit?: number;
  sinceId?: string;
}

export const api = {
  health: () => req<HealthResponse>("/health"),
  config: () => req<ConfigResponse>("/config"),
  inbox: (q: InboxQuery = {}) => {
    const params = new URLSearchParams();
    if (q.lane && q.lane !== "all") params.set("lane", q.lane);
    if (q.limit) params.set("limit", String(q.limit));
    if (q.sinceId) params.set("since_id", q.sinceId);
    const qs = params.toString();
    return req<ConversationRecord[]>(`/inbox${qs ? `?${qs}` : ""}`);
  },
  conversation: (id: string) =>
    req<ConversationRecord>(`/conversations/${encodeURIComponent(id)}`),
  classify: (body: {
    text: string;
    conversation_id?: string;
    sender_name?: string;
  }) =>
    req<MessageRecord>("/messages", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resolve: (messageId: string, label: ClassKey) =>
    req<MessageRecord>(`/messages/${encodeURIComponent(messageId)}/resolve`, {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  /** Switch Engine A (docs/04 §2.1). The backup stays reachable at runtime; the
   * response says which engine is actually serving, so the UI never assumes. */
  engine: (id: string) =>
    req<EngineSwitchResponse>("/engine", {
      method: "POST",
      body: JSON.stringify({ engine: id }),
    }),
  stats: () => req<StatsResponse>("/stats"),
  evaluation: () => req<EvalResponse>("/eval"),
};

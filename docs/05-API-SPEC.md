# 05 — API & Database Specification

Base path `/api`. JSON. No auth. Polling (2 s) instead of websockets.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{status, model_loaded, llm_provider, llm_status, engine, version}` — `engine` is the Engine A that is actually answering (docs/04 §2.2) |
| GET | `/api/inbox` | List conversations with last message + latest prediction. Query: `lane` (auto/review/scam/all), `limit`, `since_id` |
| GET | `/api/conversations/{id}` | Conversation with all messages and predictions |
| POST | `/api/messages` | Ingest + classify a message (Try It, simulator). Body below |
| POST | `/api/messages/{id}/resolve` | Human resolves a review item: `{label}` |
| POST | `/api/engine` | Switch Engine A: `{engine: "laya-ft" \| "tfidf-lr"}` → `{engine, requested, fallback, engines, reason}` |
| GET | `/api/config` | `{engine_default, engines: [{id, available, active, reason}], tau_default, tau_min, tau_max, tau_other_offset, scam_t, escalate_t, decisive_t, classes}` — `engine_default` is `tfidf-lr` unless `ENGINE_A` says otherwise; for the checkpoint `available` means *selectable* (a host probe), and `reason` explains it when it is false |
| GET | `/api/stats` | Dashboard aggregates (counts per lane/class, histogram bins, time-saved estimate) computed at the current default τ |
| GET | `/api/eval` | Static evaluation results from `artifacts/eval.json` |
| POST | `/api/simulator` | `{running: bool, interval_s}` start/stop replay |

## POST /api/messages
Request: `{"text": "string (1..1000)", "conversation_id": "optional", "sender_name": "optional"}`
Response (`MessageRecord`):
```json
{
  "id": "m_000123",
  "conversation_id": "c_017",
  "sender_name": "Nusrat",
  "text": "ei saree ta ki stock e ache?",
  "script": "bl",
  "received_at": "2026-10-16T10:42:11Z",
  "prediction": {
    "class_probs": {"order":0.91,"price_question":0.03,"delivery_problem":0.01,"complaint":0.01,"scam":0.01,"other":0.03},
    "top_class": "order",
    "top_prob": 0.91,
    "scam_prob": 0.01,
    "escalate_prob": 0.02,
    "llm_class": "order",
    "llm_reason": "Asks if an item is in stock.",
    "llm_status": "ok",
    "engine": "tfidf-lr",
    "latency_ms": 640,
    "lane": "auto",
    "route_reason": "Confident and second opinion agrees"
  },
  "resolution": null
}
```
Errors: 400 empty/too long; 429 rate limit; 503 model not ready (`{"detail":"warming_up"}`; frontend shows loading screen and retries). A lone surrogate (a legal JSON body such as `"\udc8d"`) is replaced with U+FFFD rather than answered with a 500: it cannot be encoded at all, so it would raise on the way to SQLite. `engine` names the model that answered this message — always read it, since it is `tfidf-lr` unless the `laya-ft` checkpoint has been selected and loaded (docs/04 §2.2).

## POST /api/engine — switch Engine A (docs/04 §2.2)
Request: `{"engine": "laya-ft"}`. If the checkpoint is not loaded yet **this request loads it** (~12.6 s with the weights cached), which is the whole point: the load lands on whoever asked rather than on a customer's message. Response:
```json
{
  "engine": "tfidf-lr",
  "requested": "laya-ft",
  "fallback": true,
  "engines": [
    {"id": "laya-ft", "available": false, "active": false,
     "reason": "instance has 0.5 GiB RAM, the checkpoint needs >= 3 GiB — not attempted on this deployment"},
    {"id": "tfidf-lr", "available": true, "active": true, "reason": null}
  ],
  "reason": "engine_unavailable"
}
```
- Unknown id → **400** `{"detail":"invalid_engine"}`, nothing switched.
- Known id that cannot load in this deployment → **200** with `fallback: true`, `reason: "engine_unavailable"`, and `engine` = the one actually serving. A switch the server understands but cannot honour is not an error, and must not look like a success.
- Pipeline not up yet → **503** `{"detail":"warming_up"}`.
- The choice is process-wide (one demo deployment, no accounts) — the frontend says so on the Preferences screen.

## Pydantic schemas (names)
`ClassifyRequest`, `Prediction`, `MessageRecord`, `ConversationRecord`, `ResolveRequest`, `StatsResponse`, `EvalResponse`, `HealthResponse`, `EngineRequest`, `EngineOption`, `EngineResponse`.

## SQLite schema
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  text TEXT NOT NULL,
  script TEXT NOT NULL,              -- bn | bl | en | mx
  source TEXT NOT NULL,              -- seed | simulator | user
  received_at TEXT NOT NULL
);
CREATE TABLE predictions (
  message_id TEXT PRIMARY KEY REFERENCES messages(id),
  class_probs TEXT NOT NULL,         -- JSON
  top_class TEXT NOT NULL,
  top_prob REAL NOT NULL,
  scam_prob REAL NOT NULL,
  escalate_prob REAL NOT NULL,
  llm_class TEXT,
  llm_reason TEXT,
  llm_status TEXT NOT NULL,          -- ok | unavailable
  engine TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  lane TEXT NOT NULL,                -- auto | review | scam (at default tau)
  route_reason TEXT NOT NULL
);
CREATE TABLE resolutions (
  message_id TEXT PRIMARY KEY REFERENCES messages(id),
  human_label TEXT NOT NULL,
  resolved_at TEXT NOT NULL
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, received_at);
CREATE INDEX idx_pred_lane ON predictions(lane);
```
Boot sequence: create tables → if a table that already exists does not match the schema above, drop all four and recreate (the file is disposable seed data — see below) → if `messages` empty, load `data/seed_inbox.json` and classify each seed once (cache results into `data/seed_predictions.json` so cold start does not call the LLM 60+ times; seeding stops asking the LLM after a 30 s wall-clock budget and the rest classify locally — docs/04 §3.1, so an unreachable provider can never hold the port bind).

The DB file is **disposable by design** (gitignored, ephemeral on the Space, re-seeded at boot), which is why a shape mismatch is repaired by rebuilding rather than by migrating: `CREATE TABLE IF NOT EXISTS` cannot alter an existing table, so a file written by an older build keeps its old shape and the first INSERT fails on a column this code no longer writes — a 500 on the customer's message instead of a boot error. (Seen 2026-10-18 after `conversations.avatar_color` was removed: `NOT NULL constraint failed`. A host that keeps its file across restarts, like a dev machine, is exactly where this bites.) A file this build wrote is left untouched on the next boot, so the demo inbox is not wiped on every restart.

## Frontend contract
- `lib/api.ts` is the only module that calls fetch.
- Types in `lib/types.ts` mirror Pydantic schemas.
- Lane recomputation for the slider uses `lib/route.ts` on stored signals; the server's `lane` is the value at the default τ.

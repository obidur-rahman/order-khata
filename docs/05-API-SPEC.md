# 05 — API & Database Specification

Base path `/api`. JSON. No auth. Polling (2 s) instead of websockets.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{status, model_loaded, llm_provider, llm_status, version}` |
| GET | `/api/inbox` | List conversations with last message + latest prediction. Query: `lane` (auto/review/scam/all), `limit`, `since_id` |
| GET | `/api/conversations/{id}` | Conversation with all messages and predictions |
| POST | `/api/messages` | Ingest + classify a message (Try It, simulator). Body below |
| POST | `/api/messages/{id}/resolve` | Human resolves a review item: `{label}` |
| GET | `/api/config` | `{tau_default, tau_other_offset, scam_t, classes, class_meta}` |
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
    "engine": "laya-ft",
    "latency_ms": 412,
    "lane": "auto",
    "route_reason": "Confident and second opinion agrees"
  },
  "resolution": null
}
```
Errors: 400 empty/too long; 429 rate limit; 503 model not ready (`{"detail":"warming_up"}`; frontend shows loading screen and retries).

## Pydantic schemas (names)
`ClassifyRequest`, `Prediction`, `MessageRecord`, `ConversationRecord`, `ResolveRequest`, `StatsResponse`, `EvalResponse`, `HealthResponse`.

## SQLite schema
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
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
Boot sequence: create tables → if `messages` empty, load `data/seed_inbox.json` and classify each seed once (cache results into `data/seed_predictions.json` so cold start does not call the LLM 60+ times).

## Frontend contract
- `lib/api.ts` is the only module that calls fetch.
- Types in `lib/types.ts` mirror Pydantic schemas.
- Lane recomputation for the slider uses `lib/route.ts` on stored signals; the server's `lane` is the value at the default τ.

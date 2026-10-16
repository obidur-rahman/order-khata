"""SQLite storage — schema per docs/05. Storage only; no engine calls here.

Connections are opened per operation (short-lived, thread-safe). The DB file
is ephemeral on free HF Spaces and re-seeded at boot.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from .config import data_dir, db_path

_lock = threading.Lock()

AVATAR_COLORS = ["#2F6BFF", "#7A4DFF", "#0FA3A3", "#FF4D8D", "#E6BE00", "#17A34A", "#F59E0B", "#E5252A"]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  text TEXT NOT NULL,
  script TEXT NOT NULL,
  source TEXT NOT NULL,
  received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
  message_id TEXT PRIMARY KEY REFERENCES messages(id),
  class_probs TEXT NOT NULL,
  top_class TEXT NOT NULL,
  top_prob REAL NOT NULL,
  scam_prob REAL NOT NULL,
  escalate_prob REAL NOT NULL,
  llm_class TEXT,
  llm_reason TEXT,
  llm_status TEXT NOT NULL,
  engine TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  lane TEXT NOT NULL,
  route_reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resolutions (
  message_id TEXT PRIMARY KEY REFERENCES messages(id),
  human_label TEXT NOT NULL,
  resolved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, received_at);
CREATE INDEX IF NOT EXISTS idx_pred_lane ON predictions(lane);
"""


def utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _conn() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    # Create the data directory: on the free Space the image may ship no data/
    # at all (every .jsonl there is gitignored), and SQLite cannot create a
    # database inside a directory that does not exist.
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with _lock, _conn() as conn:
        conn.executescript(_SCHEMA)


def _next_id(conn: sqlite3.Connection, table: str, prefix: str, width: int) -> str:
    n = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] + 1
    candidate = f"{prefix}{n:0{width}d}"
    while conn.execute(f"SELECT 1 FROM {table} WHERE id = ?", (candidate,)).fetchone():
        n += 1
        candidate = f"{prefix}{n:0{width}d}"
    return candidate


def create_conversation(customer_name: str, avatar_color: Optional[str] = None) -> str:
    with _lock, _conn() as conn:
        cid = _next_id(conn, "conversations", "c_", 3)
        color = avatar_color or AVATAR_COLORS[(len(customer_name) or 0) % len(AVATAR_COLORS)]
        conn.execute(
            "INSERT INTO conversations (id, customer_name, avatar_color, created_at) VALUES (?,?,?,?)",
            (cid, customer_name, color, utcnow()),
        )
        return cid


def insert_message(
    conversation_id: str,
    text: str,
    script: str,
    source: str,
    received_at: Optional[str] = None,
) -> str:
    with _lock, _conn() as conn:
        mid = _next_id(conn, "messages", "m_", 6)
        conn.execute(
            "INSERT INTO messages (id, conversation_id, text, script, source, received_at) VALUES (?,?,?,?,?,?)",
            (mid, conversation_id, text, script, source, received_at or utcnow()),
        )
        return mid


def insert_prediction(message_id: str, pred: dict[str, Any]) -> None:
    row = {
        "message_id": message_id,
        "class_probs": json.dumps(pred["class_probs"]),
        "top_class": pred["top_class"],
        "top_prob": pred["top_prob"],
        "scam_prob": pred["scam_prob"],
        "escalate_prob": pred["escalate_prob"],
        "llm_class": pred.get("llm_class"),
        "llm_reason": pred.get("llm_reason"),
        "llm_status": pred["llm_status"],
        "engine": pred["engine"],
        "latency_ms": pred["latency_ms"],
        "lane": pred["lane"],
        "route_reason": pred["route_reason"],
    }
    cols = ",".join(row)
    marks = ",".join("?" for _ in row)
    with _lock, _conn() as conn:
        conn.execute(
            f"INSERT INTO predictions ({cols}) VALUES ({marks}) "
            "ON CONFLICT(message_id) DO UPDATE SET " +
            ",".join(f"{k}=excluded.{k}" for k in row if k != "message_id"),
            tuple(row.values()),
        )


def resolve_message(message_id: str, human_label: str) -> bool:
    with _lock, _conn() as conn:
        cur = conn.execute(
            "INSERT INTO resolutions (message_id, human_label, resolved_at) VALUES (?,?,?) "
            "ON CONFLICT(message_id) DO UPDATE SET human_label=excluded.human_label, "
            "resolved_at=excluded.resolved_at",
            (message_id, human_label, utcnow()),
        )
        return cur.rowcount > 0


def message_exists(message_id: str) -> bool:
    with _conn() as conn:
        return conn.execute("SELECT 1 FROM messages WHERE id=?", (message_id,)).fetchone() is not None


def _record(conn: sqlite3.Connection, msg: sqlite3.Row) -> dict[str, Any]:
    pred = conn.execute("SELECT * FROM predictions WHERE message_id=?", (msg["id"],)).fetchone()
    res = conn.execute("SELECT * FROM resolutions WHERE message_id=?", (msg["id"],)).fetchone()
    conv = conn.execute("SELECT customer_name FROM conversations WHERE id=?", (msg["conversation_id"],)).fetchone()
    prediction = None
    if pred:
        prediction = dict(pred)
        prediction["class_probs"] = json.loads(prediction["class_probs"])
    return {
        "id": msg["id"],
        "conversation_id": msg["conversation_id"],
        "sender_name": conv["customer_name"] if conv else None,
        "text": msg["text"],
        "script": msg["script"],
        "source": msg["source"],
        "received_at": msg["received_at"],
        "prediction": prediction,
        "resolution": dict(res) if res else None,
    }


def list_conversations(lane: str = "all", limit: int = 100, since_id: Optional[str] = None) -> list[dict[str, Any]]:
    sql = """
    WITH latest AS (
      SELECT m.*, m.rowid AS msg_rowid, ROW_NUMBER() OVER (
        PARTITION BY conversation_id ORDER BY received_at DESC, rowid DESC
      ) AS rn
      FROM messages m
    )
    SELECT l.*, c.customer_name, c.avatar_color, c.created_at AS conv_created_at
    FROM latest l
    JOIN conversations c ON c.id = l.conversation_id
    JOIN predictions p ON p.message_id = l.id
    WHERE l.rn = 1
    """
    params: list[Any] = []
    if lane != "all":
        sql += " AND p.lane = ?"
        params.append(lane)
    if since_id:
        sql += " AND l.id > ?"
        params.append(since_id)
    # `received_at` has one-second resolution and the whole seed pool shares one
    # second, so ordering on it alone leaves the inbox in whatever order SQLite
    # felt like returning — the newest arrival must win, hence the insertion order
    # (rowid) as the tiebreak.
    sql += " ORDER BY l.received_at DESC, l.msg_rowid DESC LIMIT ?"
    params.append(limit)
    with _conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        out = []
        for r in rows:
            last = _record(conn, r)
            out.append({
                "id": r["conversation_id"],
                "customer_name": r["customer_name"],
                "avatar_color": r["avatar_color"],
                "created_at": r["conv_created_at"],
                "last_message": last,
                "messages": [],
            })
        return out


def get_conversation(conv_id: str) -> Optional[dict[str, Any]]:
    with _conn() as conn:
        conv = conn.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)).fetchone()
        if not conv:
            return None
        msgs = conn.execute(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY received_at ASC, rowid ASC",
            (conv_id,),
        ).fetchall()
        return {
            "id": conv["id"],
            "customer_name": conv["customer_name"],
            "avatar_color": conv["avatar_color"],
            "created_at": conv["created_at"],
            "last_message": None,
            "messages": [_record(conn, m) for m in msgs],
        }


def counts() -> dict[str, Any]:
    with _conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        lanes = {k: 0 for k in ("auto", "review", "scam")}
        for r in conn.execute("SELECT lane, COUNT(*) c FROM predictions GROUP BY lane"):
            lanes[r["lane"]] = r["c"]
        classes: dict[str, int] = {}
        for r in conn.execute("SELECT top_class, COUNT(*) c FROM predictions GROUP BY top_class"):
            classes[r["top_class"]] = r["c"]
        hist = [0] * 10
        for r in conn.execute("SELECT top_prob FROM predictions"):
            b = min(9, max(0, int(r["top_prob"] * 10)))
            hist[b] += 1
    return {"total": total, "lanes": lanes, "classes": classes, "hist": hist}


def seed_if_empty() -> list[dict[str, Any]]:
    """Load data/seed_inbox.json when the DB is empty.

    Expected shape:
    {"conversations": [{"customer_name", "messages": [{"text", "script",
      "source"?, "received_at"?}]}]}
    Returns [{message_id, text}] for predictions to be computed by the caller.
    """
    seed_path = data_dir() / "seed_inbox.json"
    with _conn() as conn:
        if conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0] > 0:
            return []
    if not seed_path.exists():
        return []
    with open(seed_path, encoding="utf-8") as f:
        seed = json.load(f)
    pending: list[dict[str, Any]] = []
    for conv in seed.get("conversations", []):
        cid = create_conversation(conv["customer_name"], conv.get("avatar_color"))
        for msg in conv.get("messages", []):
            mid = insert_message(
                cid,
                msg["text"],
                msg.get("script", "en"),
                msg.get("source", "seed"),
                msg.get("received_at"),
            )
            pending.append({"message_id": mid, "text": msg["text"]})
    return pending

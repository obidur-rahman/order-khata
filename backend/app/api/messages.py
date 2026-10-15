"""POST /api/messages (ingest + classify) and /api/messages/{id}/resolve.

Enforces docs/05 error contract here rather than via pydantic validation:
400 empty/too long/bad label, 429 rate limit, 503 warming_up.
"""
from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from .. import config, db
from ..schemas import ClassifyRequest, MessageRecord, ResolveRequest

router = APIRouter()

# In-memory per-IP rate limit (docs/05 NFR): 30/min by default.
_hits: dict[str, list[float]] = {}


def _rate_limit(ip: str) -> None:
    limit = config.RATE_LIMIT_PER_MIN
    now = time.monotonic()
    window = [t for t in _hits.get(ip, []) if now - t < 60.0]
    if len(window) >= limit:
        _hits[ip] = window
        raise HTTPException(status_code=429, detail="rate_limit")
    window.append(now)
    _hits[ip] = window


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _validate_text(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        raise HTTPException(status_code=400, detail="empty_text")
    if len(stripped) > config.MAX_TEXT_LEN:
        raise HTTPException(status_code=400, detail="text_too_long")
    return stripped


def _get_pipeline(request: Request):
    pipeline = getattr(request.app.state, "pipeline", None)
    if pipeline is None or not pipeline.ready:
        raise HTTPException(status_code=503, detail="warming_up")
    return pipeline


@router.post("/messages", response_model=MessageRecord)
def create_message(body: ClassifyRequest, request: Request) -> Any:
    text = _validate_text(body.text)
    _rate_limit(_client_ip(request))
    pipeline = _get_pipeline(request)

    if body.conversation_id and db.get_conversation(body.conversation_id):
        conv_id = body.conversation_id
    else:
        conv_id = db.create_conversation(body.sender_name or "Customer")

    pred = pipeline.classify(text, source="user")
    message_id = db.insert_message(conv_id, text, pred["script"], "user")
    db.insert_prediction(message_id, pred)
    conv = db.get_conversation(conv_id)
    for msg in conv["messages"]:
        if msg["id"] == message_id:
            return msg
    raise HTTPException(status_code=500, detail="message_not_found")


@router.post("/messages/{message_id}/resolve", response_model=MessageRecord)
def resolve_message(message_id: str, body: ResolveRequest) -> Any:
    if body.label not in config.CLASSES:
        raise HTTPException(status_code=400, detail="invalid_label")
    if not db.message_exists(message_id):
        raise HTTPException(status_code=404, detail="message_not_found")
    db.resolve_message(message_id, body.label)
    conv_id = _conversation_of(message_id)
    conv = db.get_conversation(conv_id)
    for msg in conv["messages"]:
        if msg["id"] == message_id:
            return msg
    raise HTTPException(status_code=500, detail="message_not_found")


def _conversation_of(message_id: str) -> str:
    with db._conn() as conn:  # storage layer keeps queries small; reuse here
        row = conn.execute("SELECT conversation_id FROM messages WHERE id=?", (message_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="message_not_found")
    return row["conversation_id"]

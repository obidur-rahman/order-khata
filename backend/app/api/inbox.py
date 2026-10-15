"""Read endpoints: /api/inbox and /api/conversations/{id} (docs/05)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from .. import db
from ..schemas import ConversationRecord

router = APIRouter()

_LANES = {"auto", "review", "scam", "all"}


@router.get("/inbox", response_model=list[ConversationRecord])
def inbox(
    lane: str = Query("all"),
    limit: int = Query(100, ge=1, le=500),
    since_id: str | None = Query(None),
) -> Any:
    if lane not in _LANES:
        raise HTTPException(status_code=400, detail="invalid_lane")
    return db.list_conversations(lane=lane, limit=limit, since_id=since_id)


@router.get("/conversations/{conv_id}", response_model=ConversationRecord)
def conversation(conv_id: str) -> Any:
    record = db.get_conversation(conv_id)
    if record is None:
        raise HTTPException(status_code=404, detail="conversation_not_found")
    return record

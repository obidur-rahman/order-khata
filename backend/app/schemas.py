"""Pydantic schemas (docs/05). Names match the spec exactly."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from .config import CLASSES


class ClassifyRequest(BaseModel):
    """POST /api/messages body. Length rules are enforced in the endpoint so
    violations return 400 (per docs/05), not 422."""

    text: str
    conversation_id: Optional[str] = None
    sender_name: Optional[str] = None


class Prediction(BaseModel):
    class_probs: dict[str, float]
    top_class: str
    top_prob: float
    scam_prob: float
    escalate_prob: float
    llm_class: Optional[str] = None
    llm_reason: Optional[str] = None
    llm_status: str  # ok | unavailable
    engine: str
    latency_ms: int
    lane: str  # auto | review | scam (at default tau)
    route_reason: str


class Resolution(BaseModel):
    human_label: str
    resolved_at: str


class MessageRecord(BaseModel):
    id: str
    conversation_id: str
    sender_name: Optional[str] = None
    text: str
    script: str  # bn | bl | en | mx
    source: str  # seed | simulator | user
    received_at: str
    prediction: Prediction
    resolution: Optional[Resolution] = None


class ConversationRecord(BaseModel):
    id: str
    customer_name: str
    avatar_color: str
    created_at: str
    last_message: Optional[MessageRecord] = None
    messages: list[MessageRecord] = []


class ResolveRequest(BaseModel):
    label: str


class StatsResponse(BaseModel):
    total: int
    lanes: dict[str, int]
    classes: dict[str, int]
    histogram: list[dict[str, Any]]  # [{bin_start, bin_end, count}]
    auto_count: int
    seconds_per_message: int
    time_saved_s: int


class EvalResponse(BaseModel):
    """Pass-through of backend/artifacts/eval.json (docs/07 §6)."""

    model_config = ConfigDict(extra="allow")

    generated_at: Optional[str] = None
    data: dict[str, Any] = {}
    systems: dict[str, Any] = {}
    per_class: dict[str, Any] = {}
    per_script: dict[str, Any] = {}
    calibration: dict[str, Any] = {}
    coverage_curve: list[Any] = []
    scam: dict[str, Any] = {}
    ood: dict[str, Any] = {}
    latency_ms: dict[str, Any] = {}
    limitations: list[str] = []


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    llm_provider: Optional[str]
    llm_status: str  # ok | unavailable
    version: str


__all__ = [
    "ClassifyRequest",
    "Prediction",
    "MessageRecord",
    "ConversationRecord",
    "ResolveRequest",
    "StatsResponse",
    "EvalResponse",
    "HealthResponse",
    "Resolution",
]

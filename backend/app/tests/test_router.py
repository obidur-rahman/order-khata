"""Contract tests for docs/04 (model routing), docs/05 (API schema) and the
scam invariant (never `auto` when scam_prob >= SCAM_T)."""
from __future__ import annotations

import pytest

from app.config import SCAM_T, TAU_DEFAULT, TAU_OTHER_OFFSET, DEGRADED_MARGIN
from app.router import route
from app.schemas import (
    ClassifyRequest, Prediction, MessageRecord, ConversationRecord,
    ResolveRequest, StatsResponse, EvalResponse, HealthResponse,
)
from app.engines.scam import ScamHead


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "top_prob,scam_prob,escalate_prob,llm_class,llm_status,tau,expected",
    [
        # auto lane: clear class + confident, no scam, no flag
        (0.90, 0.02, 0.0, "order", "ok", TAU_DEFAULT, "auto"),
        # confident but flagged
        (0.90, 0.70, 0.0, "order", "ok", TAU_DEFAULT, "scam"),
        # low confidence
        (0.35, 0.02, 0.0, "order", "ok", TAU_DEFAULT, "review"),
        # escalate signal
        (0.40, 0.02, 0.95, "order", "ok", TAU_DEFAULT, "review"),
        # llm disagrees with auto
        (0.88, 0.02, 0.0, "scam", "ok", TAU_DEFAULT, "review"),
        # degraded: stricter threshold; confident 0.90 -> auto
        (0.90, 0.02, 0.0, "order", "down", TAU_DEFAULT, "auto"),
        # degraded: stricter threshold; low 0.35 -> review
        (0.35, 0.02, 0.0, "order", "down", TAU_DEFAULT, "review"),
    ],
)
def test_route_rules(top_prob, scam_prob, escalate_prob, llm_class, llm_status,
                     tau, expected):
    lane, _ = route(
        {
            "top_class": "order",
            "top_prob": top_prob,
            "scam_prob": scam_prob,
            "escalate_prob": escalate_prob,
            "llm_class": llm_class,
            "llm_status": llm_status,
        },
        tau,
    )
    assert lane == expected


@pytest.mark.parametrize("scam_prob", [SCAM_T, SCAM_T + 0.001, 0.999])
def test_scam_invariant_never_auto(scam_prob):
    """Hard invariant from docs/04: scam_prob >= SCAM_T -> never lane `auto`."""
    lane, _ = route(
        {
            "top_class": "order",
            "top_prob": 0.95,
            "scam_prob": scam_prob,
            "escalate_prob": 0.0,
            "llm_class": "order",
            "llm_status": "ok",
        },
        TAU_DEFAULT,
    )
    assert lane != "auto"


# ---------------------------------------------------------------------------
# Scam head interface
# ---------------------------------------------------------------------------
def test_scam_head_bounds():
    head = ScamHead()
    assert 0.0 <= head.predict("hello") <= 1.0
    assert head.predict("otp leak advance payment") >= SCAM_T


# ---------------------------------------------------------------------------
# API schema (docs/05)
# ---------------------------------------------------------------------------
def test_prediction_in_fields():
    model = Prediction(
        class_probs={
            "order": 0.93, "price_question": 0.0, "delivery_problem": 0.0,
            "complaint": 0.0, "scam": 0.02, "other": 0.0,
        },
        top_class="order",
        top_prob=0.93,
        scam_prob=0.02,
        escalate_prob=0.0,
        llm_class="order",
        llm_reason="all engines agree",
        llm_status="ok",
        engine="stub-keywords",
        latency_ms=12,
        lane="auto",
        route_reason="confidence above threshold",
    )
    assert model.top_class == "order"
    assert model.lane == "auto"
    assert set(model.model_fields) == {
        "class_probs", "top_class", "top_prob", "scam_prob", "escalate_prob",
        "llm_class", "llm_reason", "llm_status", "engine", "latency_ms",
        "lane", "route_reason",
    }


def test_request_models():
    req = ClassifyRequest(text="টোকা চাই", source="simulator")
    assert req.text == "টোকা চাই"

    msg = MessageRecord(
        id="1", conversation_id="c1", text="hello", script="latin",
        source="simulator", received_at="2026-01-01T10:00:00Z",
        prediction=Prediction(class_probs={}, top_class="other", top_prob=0.0,
                              scam_prob=0.0, escalate_prob=0.0,
                              llm_class=None, llm_reason=None,
                              llm_status="ok", engine="test", latency_ms=0,
                              lane="auto", route_reason=""),
    )
    assert msg.text == "hello"

    conv = ConversationRecord(
        id="c1", customer_name="A", avatar_color="#2F6BFF",
        created_at="2026-01-01T00:00:00Z", messages=[msg],
    )
    assert conv.customer_name == "A"

    rr = ResolveRequest(label="scam")
    assert rr.label == "scam"


def test_response_models():
    stats = StatsResponse(
        total=5, lanes={"auto": 4, "review": 1, "scam": 0},
        classes={"order": 4}, histogram=[{"bin_start": 0, "bin_end": 1, "count": 5}],
        auto_count=4, seconds_per_message=3, time_saved_s=1080,
    )
    assert stats.auto_count == 4

    eval_resp = EvalResponse(
        generated_at="2026-01-01T00:00:00Z",
        data={"lang": "combined"},
        systems={},
        per_class={},
        per_script={},
        calibration={},
        coverage_curve=[],
        scam={},
        ood={},
        latency_ms={},
        limitations=[],
    )
    assert eval_resp.generated_at == "2026-01-01T00:00:00Z"

    health = HealthResponse(
        status="ok", model_loaded=True, llm_provider=None, llm_status="ok",
        version="0.1.0",
    )
    assert health.model_loaded is True

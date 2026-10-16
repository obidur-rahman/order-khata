"""Router policy tests — docs/04 §4. Runs the shared fixture file and unit
checks for tau_other / formatting helpers."""
from __future__ import annotations

import json

import pytest

from app.config import DECISIVE_T, TAU_DEFAULT
from app.router import fmt_prob, required_threshold, route, tau_other

from conftest import FIXTURES


def _cases():
    with open(FIXTURES / "route_cases.json", encoding="utf-8") as f:
        return json.load(f)


def test_fixture_cases():
    """Every fixture's expected lane/reason must match Python route() output."""
    for case in _cases():
        lane, reason = route(case["signals"], case.get("tau", 0.85))
        assert {"lane": lane, "reason": reason} == case["expected"], case["name"]


@pytest.mark.parametrize(
    "top_prob,scam_prob,escalate_prob,llm_class,llm_status,expected",
    [
        # rule 5: clear class, confident, nothing flagged
        (0.90, 0.02, 0.0, "order", "ok", "auto"),
        # rule 1: confident but flagged -> the invariant wins
        (0.90, 0.70, 0.0, "order", "ok", "scam"),
        # rule 3: not confident enough
        (0.35, 0.02, 0.0, "order", "ok", "review"),
        # rule 2: the customer may need a person (boundary and just under)
        (0.99, 0.02, 0.20, "order", "ok", "review"),
        (0.99, 0.02, 0.1999, "order", "ok", "auto"),
        # rule 4: the tie-breaker may veto an unsure call ...
        (0.88, 0.02, 0.0, "complaint", "ok", "review"),
        (DECISIVE_T - 0.01, 0.02, 0.0, "complaint", "ok", "review"),
        # ... but never a decisive one
        (DECISIVE_T, 0.02, 0.0, "complaint", "ok", "auto"),
        (0.95, 0.02, 0.0, "complaint", "ok", "auto"),
        # degraded: no second opinion, so the bar rises by DEGRADED_MARGIN
        (0.90, 0.02, 0.0, None, "unavailable", "auto"),
        (0.35, 0.02, 0.0, None, "unavailable", "review"),
        (0.89, 0.02, 0.0, "complaint", "unavailable", "review"),
    ],
)
def test_route_rules(top_prob, scam_prob, escalate_prob, llm_class, llm_status, expected):
    """The rule order of docs/04 §4, one case per rule and boundary."""
    lane, _ = route(
        {
            "top_class": "order",
            "top_prob": top_prob,
            "scam_prob": scam_prob,
            "escalate_prob": escalate_prob,
            "llm_class": llm_class,
            "llm_status": llm_status,
        },
        TAU_DEFAULT,
    )
    assert lane == expected


def test_tau_other():
    assert tau_other(0.85) == 0.65      # 0.85 - 0.20
    assert tau_other(0.80) == 0.60
    assert tau_other(0.79) == 0.60      # floor at 0.60
    assert tau_other(0.50) == 0.60
    assert tau_other(0.99) == 0.79


def test_fmt_prob_deterministic():
    assert fmt_prob(0.5) == "0.50"
    assert fmt_prob(0.7) == "0.70"
    assert fmt_prob(1.0) == "1.00"
    assert fmt_prob(0.0) == "0.00"
    assert fmt_prob(0.93) == "0.93"


def test_route_is_pure_no_mutation():
    signals = {
        "top_class": "order",
        "top_prob": 0.9,
        "scam_prob": 0.01,
        "escalate_prob": 0.02,
        "llm_class": "order",
        "llm_status": "ok",
    }
    snapshot = dict(signals)
    route(signals, 0.85)
    assert signals == snapshot


def test_required_threshold_matrix():
    """Rule-3 thresholds exactly as docs/04 §4 (also drawn as the UI tick)."""
    assert required_threshold("order", 0.85, False) == 0.85
    assert required_threshold("other", 0.85, False) == 0.65
    assert required_threshold("other", 0.79, False) == 0.60
    assert required_threshold("other", 0.5, False) == 0.60
    assert required_threshold("order", 0.85, True) == 0.90   # tau + 0.05
    assert required_threshold("order", 0.97, True) == 0.99   # capped
    assert required_threshold("other", 0.85, True) == 0.65   # degraded skips "other"


def test_default_tau_is_spec_default():
    from app.config import TAU_DEFAULT

    assert TAU_DEFAULT == 0.85
    assert route({
        "top_class": "order",
        "top_prob": 0.86,
        "scam_prob": 0.01,
        "escalate_prob": 0.02,
        "llm_class": "order",
        "llm_status": "ok",
    }) == ("auto", "Confident and second opinion agrees")

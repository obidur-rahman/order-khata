"""Router policy tests — docs/04 §4. Runs the shared fixture file and unit
checks for tau_other / formatting helpers."""
from __future__ import annotations

import json

from app.router import fmt_prob, route, tau_other

from conftest import FIXTURES


def _cases():
    with open(FIXTURES / "route_cases.json", encoding="utf-8") as f:
        return json.load(f)


def test_fixture_cases():
    """Every fixture's expected lane/reason must match Python route() output."""
    for case in _cases():
        lane, reason = route(case["signals"], case.get("tau", 0.85))
        assert {"lane": lane, "reason": reason} == case["expected"], case["name"]


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

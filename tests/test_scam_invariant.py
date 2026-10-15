"""Scam hard invariant (AGENTS.md, docs/04 §4 rule 1):
scam_prob >= SCAM_T -> lane is always "scam", never "auto" — regardless of
confidence, agreement, escalation or degraded mode."""
from __future__ import annotations

import itertools

from app.config import CLASSES, SCAM_T
from app.router import LANE_SCAM, route


def test_rule1_beats_every_other_signal():
    taus = [0.50, 0.85, 0.99]
    scams = [SCAM_T, 0.51, 0.75, 0.999, 1.0]
    escalates = [0.0, 0.49, 0.5, 1.0]
    tops = [0.0, 0.5, 0.99]
    llm_modes = [("order", "ok"), (None, "unavailable"), ("complaint", "ok")]
    for tau, scam, esc, top, (llm_class, llm_status) in itertools.product(
        taus, scams, escalates, tops, llm_modes
    ):
        for top_class in CLASSES:
            lane, reason = route(
                {
                    "top_class": top_class,
                    "top_prob": top,
                    "scam_prob": scam,
                    "escalate_prob": esc,
                    "llm_class": llm_class,
                    "llm_status": llm_status,
                },
                tau,
            )
            assert lane == LANE_SCAM, (
                f"INVARIANT VIOLATED: scam={scam} tau={tau} top_class={top_class} "
                f"top={top} esc={esc} llm={llm_class}/{llm_status} -> {lane}"
            )
            assert lane != "auto"
            assert reason.startswith("Scam probability")


def test_just_below_scam_threshold_is_not_scam_lane():
    lane, _ = route(
        {
            "top_class": "order",
            "top_prob": 0.99,
            "scam_prob": SCAM_T - 0.0001,
            "escalate_prob": 0.0,
            "llm_class": "order",
            "llm_status": "ok",
        },
        0.85,
    )
    assert lane == "auto"


def test_end_to_end_scam_message_never_auto():
    """Full pipeline: a scammy message must come back lane=scam (docs/PRD §6)."""
    from app.pipeline import Pipeline

    p = Pipeline.create()
    pred = p.classify(
        "Urgent! Verify your account now, send the OTP and click this link to claim your prize"
    )
    assert pred["scam_prob"] >= SCAM_T
    assert pred["lane"] == "scam"
    assert pred["class_probs"]["scam"] == pred["scam_prob"]

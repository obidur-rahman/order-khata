"""Routing policy — docs/04 §4. Pure function.

IMPORTANT: this logic is duplicated in TypeScript at frontend/lib/route.ts so
the threshold slider can recompute lanes client-side with zero network. Any
change here must be mirrored there; tests/test_parity.py feeds the same
fixtures to both implementations and asserts identical output.
"""
from __future__ import annotations

from typing import Any, Mapping, Tuple

from .config import (
    DEGRADED_MARGIN,
    DEGRADED_MAX,
    ESCALATE_T,
    SCAM_T,
    TAU_DEFAULT,
    TAU_OTHER_MIN,
    TAU_OTHER_OFFSET,
)

LANE_AUTO = "auto"
LANE_REVIEW = "review"
LANE_SCAM = "scam"
LLM_OK = "ok"


def _r2(x: float) -> float:
    """Half-up round to 2 decimals (slider precision), deterministic across
    languages — same IEEE double arithmetic as fmt_prob."""
    return int(x * 100 + 0.5) / 100.0


def tau_other(tau: float) -> float:
    """docs/04 §4: tau_other = max(0.60, tau - 0.20)."""
    return _r2(max(TAU_OTHER_MIN, tau - TAU_OTHER_OFFSET))


def fmt_prob(x: float) -> str:
    """Format a probability for route reasons.

    Deterministic half-up rounding to 2 decimals, implemented with pure IEEE
    double arithmetic so Python and TypeScript produce byte-identical strings.
    """
    cents = int(x * 100 + 0.5)  # x >= 0 always here
    return f"{cents // 100}.{cents % 100:02d}"


def route(signals: Mapping[str, Any], tau: float = TAU_DEFAULT) -> Tuple[str, str]:
    """Apply the routing policy. Returns (lane, route_reason).

    signals keys: top_class, top_prob, scam_prob, escalate_prob,
                  llm_class (Optional), llm_status ("ok" | "unavailable")

    Rules are evaluated in order, first match wins (docs/04 §4).
    """
    top_class = str(signals["top_class"])
    top_prob = float(signals["top_prob"])
    scam_prob = float(signals["scam_prob"])
    escalate_prob = float(signals["escalate_prob"])
    llm_class = signals.get("llm_class")
    llm_status = signals.get("llm_status") or "unavailable"

    # 1. Scam lane — hard invariant: never auto, regardless of anything else.
    if scam_prob >= SCAM_T:
        return LANE_SCAM, f"Scam probability {fmt_prob(scam_prob)} >= {fmt_prob(SCAM_T)}"

    # 2. Escalate: customer may need a human.
    if escalate_prob >= ESCALATE_T:
        return LANE_REVIEW, "Customer may need a human"

    # Degraded mode: no usable second signal -> skip rule 4, stricter threshold.
    degraded = llm_status != LLM_OK or not llm_class

    # 3. Low confidence.
    if top_class == "other":
        required = tau_other(tau)
    elif degraded:
        required = min(DEGRADED_MAX, _r2(tau + DEGRADED_MARGIN))
    else:
        required = tau
    if top_prob < required:
        return LANE_REVIEW, f"Low confidence (p = {fmt_prob(top_prob)})"

    # 4. Second opinion disagrees (skipped in degraded mode).
    if not degraded and str(llm_class) != top_class:
        return LANE_REVIEW, f"Second opinion disagrees (LLM: {llm_class})"

    # 5. Auto.
    if degraded:
        return LANE_AUTO, "Confident (stricter threshold; second opinion unavailable)"
    return LANE_AUTO, "Confident and second opinion agrees"

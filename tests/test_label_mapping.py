"""Label mapping tests (AGENTS.md) — docs/03 §2 mapping table must be exact."""
from __future__ import annotations

from app.config import BASE_CLASSES, CLASSES, INTENT_TO_CLASS
from app.engines.decision import aggregate_intents

# Verbatim from docs/03 §2 — the source of truth.
EXPECTED = {
    "order": ["product_search", "product_availability", "order_cancel"],
    "price_question": ["price_inquiry", "discount_offer"],
    "delivery_problem": ["shipping_delivery", "order_status"],
    "complaint": ["complaint", "return_refund", "payment_issue"],
    "other": ["greeting", "goodbye", "thanks", "out_of_scope", "agent_request"],
}


def test_all_15_intents_mapped_exactly_once():
    flat = [i for intents in EXPECTED.values() for i in intents]
    assert len(flat) == 15
    assert sorted(INTENT_TO_CLASS.keys()) == sorted(flat)


def test_mapping_matches_doc_table():
    for cls, intents in EXPECTED.items():
        for intent in intents:
            assert INTENT_TO_CLASS[intent] == cls, f"{intent} should map to {cls}"


def test_no_intent_maps_to_scam():
    """D1 contains no scam class; scam mass comes only from the scam head."""
    assert "scam" not in INTENT_TO_CLASS.values()


def test_agent_request_maps_to_other_but_escalates():
    """docs/03 §2: agent_request -> other, always escalated upstream."""
    assert INTENT_TO_CLASS["agent_request"] == "other"


def test_all_mapped_values_are_valid_classes():
    assert set(CLASSES) == {"order", "price_question", "delivery_problem", "complaint", "scam", "other"}
    for cls in INTENT_TO_CLASS.values():
        assert cls in CLASSES


def test_aggregate_one_hot_intent():
    for intent, expected_cls in INTENT_TO_CLASS.items():
        probs = {i: 0.0 for i in INTENT_TO_CLASS}
        probs[intent] = 1.0
        agg = aggregate_intents(probs)
        assert set(agg.keys()) == set(BASE_CLASSES)  # 5 classes, no scam key
        assert agg[expected_cls] == 1.0, intent
        others = {c: p for c, p in agg.items() if c != expected_cls}
        assert all(p == 0.0 for p in others.values())


def test_aggregate_preserves_total_mass():
    probs = {i: 1.0 / 15 for i in INTENT_TO_CLASS}
    agg = aggregate_intents(probs)
    assert abs(sum(agg.values()) - 1.0) < 1e-9

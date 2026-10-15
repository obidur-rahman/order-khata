"""Decision engine — S1 (docs/04 §1).

Production engine: Laya fine-tuned checkpoint (Hour-0 gate, docs/08 Phase 0).
Until it lands, a deterministic keyword stub implements the same interface so
the whole pipeline runs and tests offline. The stub returns per-class scores
passed through a sharp softmax — confident on clear single-class signals,
unsure on conflicting or unknown text (which routes to review, as it should).
"""
from __future__ import annotations

import math
import re

from ..config import BASE_CLASSES, INTENT_TO_CLASS

# Latin tokens are matched on word boundaries; Bengali tokens match as
# substrings (the lookarounds only guard against Latin letters).
def _hit(text: str, token: str) -> bool:
    return re.search(r"(?<![A-Za-z])" + re.escape(token) + r"(?![A-Za-z])", text, re.I) is not None


KEYWORDS: dict[str, tuple[str, ...]] = {
    "order": (
        "order", "buy", "purchase", "book", "stock", "available",
        "নিতে", "নিতে চাই", "কিনব", "কিনতে", "chailam", "chau", "nibo",
    ),
    "price_question": (
        "price", "cost", "discount", "offer", "rate", "cheap",
        "কত", "দাম", "টাকা", "koto", "tk", "taka", "dam",
    ),
    "delivery_problem": (
        "delivery", "deliver", "shipping", "courier", "tracking", "address",
        "পৌঁছ", "কত দিন", "কতদিন",
    ),
    "complaint": (
        "complaint", "complain", "refund", "return", "damaged", "broken",
        "wrong", "missing", "not working",
        "খারাপ", "ভুল", "বিরক্ত",
    ),
}

_ESCALATE_KEYWORDS: tuple[str, ...] = (
    "human", "agent", "admin", "manager", "support team", "call me",
    "আলাদা ভাবে", "ম্যানেজার",
)

_SOFTMAX_T = 0.25  # sharp: a single clear signal scores ~0.92


def aggregate_intents(intent_probs: dict[str, float]) -> dict[str, float]:
    """15 D1 intents -> 5 base classes (docs/04 §1, docs/03 §2). Scam has no
    D1 intents; its mass comes from the scam head in the pipeline."""
    out = {c: 0.0 for c in BASE_CLASSES}
    for intent, p in intent_probs.items():
        cls = INTENT_TO_CLASS.get(intent)
        if cls is not None and cls != "scam":
            out[cls] += float(p)
    return out


class DecisionEngine:
    """Interface: predict(normalized_text) -> (base_probs, escalate_prob)."""

    name = "stub-keywords"

    def predict(self, text: str) -> tuple[dict[str, float], float]:
        lower = text.lower()
        hits = {c: sum(1 for tok in toks if _hit(lower, tok)) for c, toks in KEYWORDS.items()}
        escalate = 1.0 if any(_hit(lower, tok) for tok in _ESCALATE_KEYWORDS) else 0.02

        if sum(hits.values()) == 0:
            hits["other"] = 0.0  # unknown text: small bias, lands in review
            scores = {c: (0.5 if c == "other" else 0.0) for c in BASE_CLASSES}
        else:
            scores = {c: float(hits.get(c, 0)) for c in BASE_CLASSES}

        # Sharp softmax over class scores.
        shifted = {c: s / _SOFTMAX_T for c, s in scores.items()}
        m = max(shifted.values())
        exps = {c: math.exp(v - m) for c, v in shifted.items()}
        z = sum(exps.values())
        probs = {c: exps[c] / z for c in BASE_CLASSES}
        return probs, escalate

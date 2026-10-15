"""Scam head — S3 (docs/04 §1).

Production: TF-IDF char n-grams + logistic regression trained on D2 with
Platt scaling (ml/04_train_scam_head.py). Until that artifact exists, a
keyword stub implements the same `predict -> probability` interface. Binary
by design: it flags fraud, it does not predict the other five classes.
"""
from __future__ import annotations

import re

_SCAM_KEYWORDS: tuple[str, ...] = (
    "otp", "password", "পাসওয়ার্ড", "prize", "প্রাইজ",
    "জিতেছেন", "জেতেছেন", "লিংক", "ভুয়া",
    "advance payment", "prepaid", "আগে টাকা", "send money",
    "secret code", "গোপন কোড", "verify your account", "account suspend",
    "click", "expires today", "শুধুমাত্র আজ",
)

_NO_HIT = 0.05      # baseline: normal shop chat is not suspicious
_PER_HIT = 0.15
_CAP = 0.95


class ScamHead:
    """Interface: predict(normalized_text) -> scam_prob in [0, 1]."""

    name = "stub-keywords"

    def predict(self, text: str) -> float:
        lower = text.lower()
        hits = sum(1 for tok in _SCAM_KEYWORDS if re.search(r"(?<![A-Za-z])" + re.escape(tok) + r"(?![A-Za-z])", lower))
        if hits == 0:
            return _NO_HIT
        return min(_CAP, 0.55 + _PER_HIT * hits)

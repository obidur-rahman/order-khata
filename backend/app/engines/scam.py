"""Scam head — S3 (docs/04 §1).

Production engine: TF-IDF char n-grams + logistic regression trained on D2 with
Platt scaling (notebook section 6.2/6.3), stored as `scam_head.joblib`. Binary by
design: it flags fraud, it does not predict the other five classes.

With no artifact it returns 0.0 — "I have no evidence of fraud", not "I checked
and it is clean". The message is still routed by the rules that do work, and the
health endpoint reports `model_loaded: false` so nobody mistakes the absence of a
model for a clean bill of health.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from ..config import artifacts_dir

log = logging.getLogger("order_khata.engines.scam")


class ScamHead:
    """Interface: predict(normalized_text) -> scam_prob in [0, 1]."""

    def __init__(self, head: Any = None, meta: Optional[dict] = None) -> None:
        self._head = head
        self.meta = meta or {}

    @property
    def loaded(self) -> bool:
        return self._head is not None

    @property
    def name(self) -> str:
        return "tfidf-lr-platt" if self.loaded else "unavailable"

    @classmethod
    def load(cls) -> "ScamHead":
        try:
            import joblib

            blob = joblib.load(artifacts_dir() / "scam_head.joblib")
            return cls(head=blob["scam_head"],
                       meta={"kind": blob.get("kind"), "trained_on": blob.get("trained_on")})
        except Exception as exc:  # noqa: BLE001 — degraded mode is a supported state
            log.warning("scam artifact not loaded (%s): %s", type(exc).__name__, exc)
            return cls()

    def predict(self, text: str) -> float:
        if not self.loaded:
            return 0.0
        # The artifact is already Platt-calibrated (notebook 6.2), so this number
        # is comparable with SCAM_T without a second mapping.
        return float(self._head.predict_proba([text])[0, 1])

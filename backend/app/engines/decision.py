"""Decision engine — S1 (docs/04 §1).

The shipped engine is the artifact trained in `ml/notebooks/order_khata_lab.ipynb`:
TF-IDF char n-grams + logistic regression over the 15 D1 intents (section 3.1),
aggregated into the 5 base classes, plus a binary escalate head with the Platt
calibrator fitted on validation (section 5.1).

`aggregate_intents` is the pure part and stays byte-identical to that notebook's
inlined copy (section 0.4).

There is no keyword fallback. With no artifact the engine reports itself
unavailable and returns a flat distribution, which cannot clear any threshold, so
every message goes to review — honest, and the app still boots (AGENTS.md
degraded-mode rule). Keyword heuristics scored confident nonsense and looked like
a second opinion without being one.
"""
from __future__ import annotations

import logging
import math
from typing import Any, Optional

from ..config import BASE_CLASSES, INTENT_TO_CLASS, artifacts_dir

log = logging.getLogger("order_khata.engines.decision")


def aggregate_intents(intent_probs: dict[str, float]) -> dict[str, float]:
    """15 D1 intents -> 5 base classes (docs/04 §1, docs/03 §2). Scam has no
    D1 intents; its mass comes from the scam head in the pipeline."""
    out = {c: 0.0 for c in BASE_CLASSES}
    for intent, p in intent_probs.items():
        cls = INTENT_TO_CLASS.get(intent)
        if cls is not None and cls != "scam":
            out[cls] += float(p)
    return out


def _logit(p: float) -> float:
    """Probability -> log-odds, clipped away from 0 and 1 (notebook 5.1)."""
    p = min(max(float(p), 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


class DecisionEngine:
    """Interface: predict(normalized_text) -> (base_probs, escalate_prob)."""

    def __init__(
        self,
        intent_clf: Any = None,
        escalate_clf: Any = None,
        escalate_cal: Any = None,
        meta: Optional[dict] = None,
    ) -> None:
        self._intent = intent_clf
        self._escalate = escalate_clf
        self._cal = escalate_cal
        self.meta = meta or {}

    @property
    def loaded(self) -> bool:
        return self._intent is not None and self._escalate is not None and self._cal is not None

    @property
    def name(self) -> str:
        return "tfidf-lr" if self.loaded else "unavailable"

    @classmethod
    def load(cls) -> "DecisionEngine":
        """Load both artifacts, or return an engine that honestly knows nothing.

        Any failure lands here — a missing file, a pickle from an incompatible
        scikit-learn, a truncated download. Boot must not depend on the artifact
        being present, so the broad catch is the point.
        """
        try:
            import joblib

            intent = joblib.load(artifacts_dir() / "decision_tfidf.joblib")
            esc = joblib.load(artifacts_dir() / "escalate_tfidf.joblib")
            return cls(
                intent_clf=intent["intent_clf"],
                escalate_clf=esc["escalate_clf"],
                escalate_cal=esc["escalate_cal"],
                meta={
                    "intent_kind": intent.get("kind"),
                    "escalate_kind": esc.get("kind"),
                    "trained_on": intent.get("trained_on"),
                    "calibrated_on": esc.get("calibrated_on"),
                },
            )
        except Exception as exc:  # noqa: BLE001 — degraded mode is a supported state
            log.warning("decision artifacts not loaded (%s): %s; "
                        "every message will go to review", type(exc).__name__, exc)
            return cls()

    def predict(self, text: str) -> tuple[dict[str, float], float]:
        if not self.loaded:
            flat = 1.0 / len(BASE_CLASSES)
            return {c: flat for c in BASE_CLASSES}, 0.0

        row = self._intent.predict_proba([text])[0]
        intents = self._intent.named_steps["lr"].classes_
        base5 = aggregate_intents(dict(zip(intents, row)))

        # Raw head, then calibration — both steps, always in this order, exactly
        # as notebook section 5.1 defines them.
        raw = float(self._escalate.predict_proba([text])[0, 1])
        escalate = float(self._cal.predict_proba([[_logit(raw)]])[0, 1])
        return base5, escalate

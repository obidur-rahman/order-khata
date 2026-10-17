"""Engine A — S1 — the adopted Laya checkpoint (docs/04 §2.1).

`nafiullah/laya-multilingual-bn-ecom-voice`: a 322M mmBERT encoder fine-tuned into
*typed decisions* (no generated tokens). It answers the same three questions its own
`questions.yaml` defines; we use `intent` for S1 and ignore `order_confirm` (the router
has no use for it — docs/04 §1), and we deliberately do **not** take its `escalate`
answer: the router's rule 2 threshold (`ESCALATE_T = 0.20`) is fitted for the
Platt-calibrated TF-IDF head, and pointing it at an uncalibrated signal is exactly the
mistake docs/04 §2.1 records. S2 therefore stays on the TF-IDF head whichever engine S1
uses.

Deliberately optional, in the strongest sense: torch and the `laya` package are **not**
in `requirements.txt`. If they are missing, if the weights cannot be fetched, if the
custom runtime fails — `load()` returns an engine that reports `loaded = False` and the
pipeline falls back to `tfidf-lr` and says so through `/api/health`. Boot never depends
on this file working.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from ..config import LAYA_REPO
from .decision import aggregate_intents

log = logging.getLogger("order_khata.engines.laya")

# The checkpoint's questions.yaml, `instructions[0]` — the canonical wording used at
# training and evaluation. A paraphrased question is a way to "discover" that a good
# model is bad, so this is copied, not rewritten.
QUESTIONS: dict[str, Any] = {
    "intent": {
        "type": "choice",
        "instructions": "What is the customer's intent?",
        "criteria": {
            "greeting": "says hello or starts the conversation",
            "goodbye": "ends the conversation",
            "thanks": "thanks or praises the service",
            "product_search": "looks for a kind of product to buy",
            "product_availability": "asks whether an item is in stock or available",
            "price_inquiry": "asks the price or cost of an item",
            "order_status": "asks where their order is or what state it is in",
            "order_cancel": "wants to cancel an order",
            "return_refund": "wants to return an item or get money back",
            "shipping_delivery": "asks about delivery time, charge, area or pickup",
            "payment_issue": "has a problem paying or with a payment method",
            "discount_offer": "asks about discounts, coupons or offers",
            "complaint": "is unhappy about a product, order or service",
            "agent_request": "asks to talk to a human agent",
            "out_of_scope": "talks about something unrelated to shopping",
        },
    },
    "escalate": {
        "type": "noul",
        "instructions": "This call should be transferred to a human agent.",
        "criteria": {"false": "the automated agent can keep handling the customer",
                     "true": "a human agent should take over"},
    },
}


def flatten_answers(answers: dict[str, Any]) -> dict[str, float]:
    """The model's intent answer -> the 15 intent probabilities -> the 5 base classes.

    Kept pure and public so it can be tested without torch: this fold is the only
    place a Laya answer turns into a signal, and it is the same `aggregate_intents`
    the baseline uses (one mapping, not two that can drift).

    Two corrections the raw answer needs, both narrow on purpose:
    * non-numeric values are dropped rather than coerced;
    * the checkpoint returns its probabilities rounded to four decimals, so a full
      answer sums to ~0.9998. When *everything* it said maps to a known intent,
      that gap is rounding noise and the result is re-normalised — the 6-class
      vector is drawn as a distribution (docs/06 §5) and must sum to one. When part
      of the answer is unrecognised, nothing is rescaled: the remaining mass stays
      where it is and the hole stays visible, instead of a dropped label being
      turned into certainty the model never expressed.
    """
    intent = answers.get("intent") or {}
    raw = intent.get("probabilities") or {}
    probs = {str(k): float(v) for k, v in raw.items() if isinstance(v, (int, float))}
    if not probs:
        # A `choice` answer without probabilities still names a class. Use it, at
        # certainty, rather than pretending the model said nothing.
        choice = intent.get("choice")
        probs = {str(choice): 1.0} if choice else {}

    base5 = aggregate_intents(probs)
    total = sum(base5.values())
    if total > 0 and total >= sum(probs.values()) - 1e-3:
        base5 = {cls: p / total for cls, p in base5.items()}
    return base5


class LayaEngine:
    """S1 backed by the checkpoint. `loaded = False` is a supported state."""

    def __init__(self, agent: Any = None, repo: str = LAYA_REPO,
                 error: Optional[str] = None) -> None:
        self._agent = agent
        self.repo = repo
        self.error = error

    @property
    def name(self) -> str:
        return "laya-ft"

    @property
    def loaded(self) -> bool:
        return self._agent is not None

    @classmethod
    def load(cls, repo: str = LAYA_REPO) -> "LayaEngine":
        """Load the checkpoint, or return an engine that honestly knows nothing.

        Any failure lands here: no torch, no package, no weights, no network on a
        cold ephemeral disk, a custom runtime that changed under us. This is the
        normal path on a machine that only installed `requirements.txt`.
        """
        try:
            import laya  # noqa: PLC0415 — optional dependency, imported on purpose late

            agent = laya.load(repo)
            log.info("laya engine loaded: %s", repo)
            return cls(agent=agent, repo=repo)
        except Exception as exc:  # noqa: BLE001 — fallback is a supported state
            log.warning("laya engine unavailable (%s: %s); falling back to %s",
                        type(exc).__name__, exc, "tfidf-lr")
            return cls(error=f"{type(exc).__name__}: {exc}")

    def predict_base5(self, text: str) -> dict[str, float]:
        """5-class probabilities for one message. Raises if not loaded."""
        if self._agent is None:
            raise RuntimeError("laya engine is not loaded")
        answers = self._agent.predict(text, QUESTIONS)["answers"]
        return flatten_answers(answers)

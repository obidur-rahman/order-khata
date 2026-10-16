"""Classify pipeline: normalize -> engines -> calibration -> router (docs/02 §4).

Produces the `Prediction` fields of docs/05 (lane at the default tau). Pure
CPU, no network unless an LLM provider key is configured.
"""
from __future__ import annotations

import json
import time

from .config import TAU_DEFAULT, data_dir
from .engines.calibrate import load_temperature, scaled_probs
from .engines.decision import DecisionEngine
from .engines.llm import LLMClient
from .engines.scam import ScamHead
from .router import route
from .text import detect_script, normalize


class Pipeline:
    def __init__(
        self,
        decision: DecisionEngine | None = None,
        scam_head: ScamHead | None = None,
        llm: LLMClient | None = None,
        temperature: float | None = None,
        ready: bool = True,
    ) -> None:
        # `or` is not used for the engines: an engine that loaded nothing is still
        # an engine, and swapping it for a second guess would hide the failure.
        self.decision = DecisionEngine.load() if decision is None else decision
        self.scam_head = ScamHead.load() if scam_head is None else scam_head
        self.llm = llm or LLMClient()
        self.temperature = load_temperature() if temperature is None else temperature
        self.ready = ready

    @classmethod
    def create(cls) -> "Pipeline":
        return cls()

    @property
    def model_loaded(self) -> bool:
        """True only when both trained artifacts are actually in memory."""
        return self.decision.loaded and self.scam_head.loaded

    @property
    def engine_name(self) -> str:
        if self.model_loaded:
            return self.decision.name
        missing = [n for n, ok in (("decision", self.decision.loaded),
                                   ("scam", self.scam_head.loaded)) if not ok]
        return f"unavailable (no artifact: {', '.join(missing)})"

    @property
    def llm_status(self) -> str:
        return self.llm.status

    def classify(self, text: str, source: str = "user") -> dict:
        """Returns the Prediction dict (docs/05), lane at TAU_DEFAULT."""
        t0 = time.perf_counter()
        normalized = normalize(text)
        script = detect_script(text)

        base5, escalate_prob = self.decision.predict(normalized)
        base5 = scaled_probs(base5, self.temperature)
        scam_prob = self.scam_head.predict(normalized)

        # 6-class vector: 5 classes scaled by (1 - scam_prob) + scam (docs/04 §1)
        class_probs = {c: p * (1.0 - scam_prob) for c, p in base5.items()}
        class_probs["scam"] = scam_prob
        top_class = max(class_probs, key=class_probs.get)
        top_prob = class_probs[top_class]

        llm_class, llm_reason, llm_status = self.llm.call(normalized)
        lane, reason = route(
            {
                "top_class": top_class,
                "top_prob": top_prob,
                "scam_prob": scam_prob,
                "escalate_prob": escalate_prob,
                "llm_class": llm_class,
                "llm_status": llm_status,
            },
            TAU_DEFAULT,
        )
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "class_probs": class_probs,
            "top_class": top_class,
            "top_prob": top_prob,
            "scam_prob": scam_prob,
            "escalate_prob": escalate_prob,
            "llm_class": llm_class,
            "llm_reason": llm_reason,
            "llm_status": llm_status,
            "engine": self.engine_name,
            "latency_ms": latency_ms,
            "lane": lane,
            "route_reason": reason,
            "script": script,
            "source": source,
        }


def seed_predictions_path():
    return data_dir() / "seed_predictions.json"


def load_seed_prediction_cache() -> dict:
    try:
        with open(seed_predictions_path(), encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def save_seed_prediction_cache(cache: dict) -> None:
    try:
        path = seed_predictions_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
    except OSError:
        pass  # cache is best-effort; ephemeral disk must not break boot

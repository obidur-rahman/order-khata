"""Classify pipeline: normalize -> engines -> calibration -> router (docs/02 §4).

Produces the `Prediction` fields of docs/05 (lane at the default tau). Pure
CPU, no network unless an LLM provider key is configured.

Two engines can drive S1 (docs/04 §2.1). The TF-IDF/logistic-regression baseline
is the default and the automatic fallback; the Laya checkpoint is opt-in, loaded
only when it is selected, and skipped entirely on a host too small to hold it. S2
and S3 (the escalate and scam heads) are unaffected by that choice.
"""
from __future__ import annotations

import json
import logging
import threading
import time

from .config import (
    ENGINE_CHOICES,
    ENGINE_DEFAULT,
    ENGINE_LAYA,
    ENGINE_TFIDF,
    TAU_DEFAULT,
    data_dir,
)
from .engines.calibrate import load_temperature, scaled_probs
from .engines.decision import DecisionEngine
from .engines.laya import LayaEngine, refusal_reason
from .engines.llm import LLMClient
from .engines.scam import ScamHead
from .router import route
from .text import detect_script, normalize

log = logging.getLogger("order_khata.pipeline")


class Pipeline:
    def __init__(
        self,
        decision: DecisionEngine | None = None,
        scam_head: ScamHead | None = None,
        llm: LLMClient | None = None,
        temperature: float | None = None,
        ready: bool = True,
        laya: LayaEngine | None = None,
        engine: str | None = None,
    ) -> None:
        # `or` is not used for the engines: an engine that loaded nothing is still
        # an engine, and swapping it for a second guess would hide the failure.
        self.decision = DecisionEngine.load() if decision is None else decision
        self.scam_head = ScamHead.load() if scam_head is None else scam_head
        self.llm = llm or LLMClient()
        self.temperature = load_temperature() if temperature is None else temperature
        self.ready = ready
        # Lazy on purpose (docs/04 §2.2). The checkpoint needs ~1.3 GB of RAM and a
        # 512 MiB instance is killed outright by holding it, so `laya-ft` is not the
        # default and nothing here touches torch at boot. An injected engine counts
        # as already decided: a caller passing an unloaded one is asserting the
        # fallback, not asking for a load.
        self.laya = LayaEngine() if laya is None else laya
        self._laya_attempted = laya is not None
        self._laya_lock = threading.Lock()
        # Only an explicit selection loads the checkpoint. `ENGINE_A=laya-ft` is one
        # (made at deploy time); the default is not, and neither is merely having
        # torch installed on the box.
        requested = engine or ENGINE_DEFAULT
        if requested == ENGINE_LAYA:
            self.ensure_laya()
        self.s1_name = self._resolve_engine(requested)

    @classmethod
    def create(cls) -> "Pipeline":
        return cls()

    # -- engine selection (docs/04 §2.1) -------------------------------------
    def ensure_laya(self) -> LayaEngine:
        """Load the checkpoint if it has not been tried yet; return the holder.

        The one place `LayaEngine.load()` is ever called from. Idempotent and
        thread-safe, so two racing switches cannot pay the ~13 s load twice, and
        a failed attempt is remembered rather than retried on every request.
        """
        if self.laya.loaded or self._laya_attempted:
            return self.laya
        with self._laya_lock:
            if not self._laya_attempted:
                self._laya_attempted = True
                self.laya = LayaEngine.load()
        return self.laya

    @property
    def laya_reason(self) -> str | None:
        """Why the checkpoint cannot answer here, or None when it can (or is).

        Cheap enough to ask on every page load: an un-attempted checkpoint is
        judged by the host probe alone, so this never imports torch and never
        triggers a load. `None` means "selectable", not "running".
        """
        if self.laya.loaded:
            return None
        if self._laya_attempted:
            return self.laya.error or "the checkpoint failed to load"
        return refusal_reason()

    def engines(self) -> list[dict]:
        """Every engine S1 can run, in preference order, with availability and —
        when one cannot run here — the one-line reason why, so the switch screen
        can say what is wrong instead of showing a dead option."""
        laya_reason = self.laya_reason
        tfidf_reason = None if self.decision.loaded else "decision artifacts are missing"
        return [
            {"id": ENGINE_LAYA, "available": laya_reason is None,
             "active": self.s1_name == ENGINE_LAYA, "reason": laya_reason},
            {"id": ENGINE_TFIDF, "available": tfidf_reason is None,
             "active": self.s1_name == ENGINE_TFIDF, "reason": tfidf_reason},
        ]

    def _available(self, name: str) -> bool:
        """Can this engine answer *right now*? Loaded, not merely loadable."""
        if name == ENGINE_LAYA:
            return self.laya.loaded
        if name == ENGINE_TFIDF:
            return self.decision.loaded
        return False

    def _resolve_engine(self, requested: str) -> str:
        """The engine that will actually run: the request if it can, else the
        backup, else the request anyway so the failure stays visible."""
        if self._available(requested):
            return requested
        for fallback in (ENGINE_TFIDF, ENGINE_LAYA):
            if self._available(fallback):
                return fallback
        return requested

    def set_engine(self, requested: str) -> str:
        """Switch S1 at runtime. Returns the engine that is now active (which is
        the requested one, or the backup if the request cannot run).

        Selecting the checkpoint is what loads it (docs/04 §2.2). The ~13 s is
        then paid by whoever asked — here, in the switch request — instead of by a
        customer's message, and it is paid once.
        """
        if requested not in ENGINE_CHOICES:
            raise ValueError(requested)
        if requested == ENGINE_LAYA:
            self.ensure_laya()
        self.s1_name = self._resolve_engine(requested)
        return self.s1_name

    @property
    def s1(self):
        """The active S1 engine. Both expose `.name`, `.loaded`, predict_base5()."""
        return self.laya if self.s1_name == ENGINE_LAYA else self.decision

    @property
    def model_loaded(self) -> bool:
        """True only when the signals the router needs are actually in memory:
        the active S1 engine, plus the scam head and the S2 escalate head."""
        return self.s1.loaded and self.decision.loaded and self.scam_head.loaded

    @property
    def engine_name(self) -> str:
        """What the API reports per message and on /api/health: the engine that
        answered, or an honest description of why there is none."""
        if self.s1.loaded:
            return self.s1.name
        missing = [n for n, ok in (("decision", self.decision.loaded),
                                   ("scam", self.scam_head.loaded)) if not ok]
        return f"unavailable (no artifact: {', '.join(missing)})"

    @property
    def llm_status(self) -> str:
        return self.llm.status

    def s1_base5(self, text: str) -> tuple[dict[str, float], str]:
        """S1 probabilities plus the name of the engine that produced them.

        The fitted temperature belongs to the TF-IDF model, which is why it is
        applied only there: scaling the checkpoint's probabilities with another
        model's temperature would be a made-up number. And a checkpoint that fails
        mid-request must not fail the request — S1 falls back to the baseline for
        that message, and the reported `engine` says which one answered.
        """
        if self.s1_name == ENGINE_TFIDF:
            return (scaled_probs(self.decision.predict_base5(text), self.temperature),
                    ENGINE_TFIDF)
        try:
            return self.s1.predict_base5(text), self.s1.name
        except Exception as exc:  # noqa: BLE001 — never lose a customer message
            log.warning("laya predict failed (%s: %s); answering with %s",
                        type(exc).__name__, exc, ENGINE_TFIDF)
            return (scaled_probs(self.decision.predict_base5(text), self.temperature),
                    ENGINE_TFIDF)

    def classify(self, text: str, source: str = "user", use_llm: bool = True) -> dict:
        """Returns the Prediction dict (docs/05), lane at TAU_DEFAULT.

        `use_llm=False` is the degraded-mode prediction: the second signal is
        never asked and reports `unavailable`. Boot seeding uses it when its
        wall-clock budget is spent (docs/04 §3.1); every other field is
        answered normally either way, so a seed without the LLM is an ordinary
        review, not a special case.
        """
        t0 = time.perf_counter()
        normalized = normalize(text)
        script = detect_script(text)

        base5, engine_used = self.s1_base5(normalized)               # S1
        escalate_prob = self.decision.predict_escalate(normalized)   # S2, always
        scam_prob = self.scam_head.predict(normalized)               # S3

        # 6-class vector: 5 classes scaled by (1 - scam_prob) + scam (docs/04 §1)
        class_probs = {c: p * (1.0 - scam_prob) for c, p in base5.items()}
        class_probs["scam"] = scam_prob
        top_class = max(class_probs, key=class_probs.get)
        top_prob = class_probs[top_class]

        if use_llm:
            llm_class, llm_reason, llm_status = self.llm.call(normalized)
        else:
            llm_class, llm_reason, llm_status = None, None, "unavailable"
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
            "engine": engine_used,
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

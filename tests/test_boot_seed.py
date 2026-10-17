"""Boot seeding runs under a wall-clock budget (docs/04 §3.1, docs/05).

The evidence: on a Render free instance whose egress to the LLM providers
times out, cold start re-walked every seed message through the provider
chain (~12 s each: 3 s x one retry x each model entry), uvicorn never bound
its port, and the deploy died on Render's "Port scan timeout reached"
(2026-10-17). Past the budget, seeds must classify locally: no network, an
honest `unavailable` second signal, and a boot that always reaches the bind.
"""
from __future__ import annotations

from app import main


class RecordingPipeline:
    """Duck-types the one method _seed_predictions uses."""

    def __init__(self) -> None:
        self.used_llm: list[bool] = []

    def classify(self, text, source="user", use_llm=True):
        self.used_llm.append(use_llm)
        return {
            "llm_class": None,
            "llm_reason": None,
            "llm_status": "ok" if use_llm else "unavailable",
            "top_class": "other",
            "top_prob": 0.5,
        }


def _isolate(monkeypatch, budget: float) -> None:
    """A spent budget must be the *only* thing under test: the cache, the
    writer and the DB row are out of scope and must not touch dev data."""
    monkeypatch.setattr(main, "SEED_LLM_DEADLINE_S", budget)
    monkeypatch.setattr(main, "load_seed_prediction_cache", lambda: {})
    monkeypatch.setattr(main, "save_seed_prediction_cache", lambda cache: None)
    monkeypatch.setattr(main.db, "insert_prediction", lambda *a, **k: None)


def _pending(n: int) -> list[dict]:
    return [{"message_id": f"m{i}", "text": "hello"} for i in range(n)]


def test_a_spent_budget_means_no_seed_asks_the_llm(monkeypatch):
    _isolate(monkeypatch, 0.0)  # budget gone before the first seed
    pipe = RecordingPipeline()
    main._seed_predictions(pipe, _pending(5))
    assert pipe.used_llm == [False] * 5


def test_a_generous_budget_asks_for_every_seed(monkeypatch):
    _isolate(monkeypatch, 9999.0)
    pipe = RecordingPipeline()
    main._seed_predictions(pipe, _pending(5))
    assert pipe.used_llm == [True] * 5


def test_an_empty_pending_list_is_a_no_op(monkeypatch):
    _isolate(monkeypatch, 0.0)
    pipe = RecordingPipeline()
    main._seed_predictions(pipe, [])
    assert pipe.used_llm == []

"""Engine parity — the app must reproduce the notebook's own numbers.

The notebook (`ml/notebooks/order_khata_lab.ipynb`) is the single source of truth
for the pipeline; `backend/app/` is the port. Ports drift silently, and every
number the UI shows comes from `backend/artifacts/eval.json`, so this test
re-derives the two artifact-only metrics the eval file reports and holds the app
to them exactly:

* E1 accuracy — the calibrated decision model, whole test split, no LLM involved.
* scam false-alarm rate on D1 test — the scam head at the shipped `SCAM_T`.

"Exactly" is deliberate: these are the same arithmetic on the same artifact, so
anything but bit-for-bit agreement means the port changed the model.

Skipped when the gitignored artifacts are absent (a fresh clone has none).
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
DATA = BACKEND / "data"
ARTIFACTS = BACKEND / "artifacts"

pytestmark = pytest.mark.skipif(
    not (ARTIFACTS / "eval.json").exists() or not (DATA / "d1_test.jsonl").exists(),
    reason="no eval.json / d1_test.jsonl yet — run the notebook first",
)


def _rows() -> list[dict]:
    with open(DATA / "d1_test.jsonl", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


@pytest.fixture(scope="module")
def expected() -> dict:
    with open(ARTIFACTS / "eval.json", encoding="utf-8") as f:
        return json.load(f)


def test_app_decision_engine_reproduces_notebook_e1(expected):
    from app.config import TAU_DEFAULT  # noqa: F401  (import proves config loads)
    from app.engines.calibrate import load_temperature, scaled_probs
    from app.engines.decision import DecisionEngine

    engine = DecisionEngine.load()
    assert engine.loaded, "artifacts present but the engine did not load"
    temperature = load_temperature()

    rows = _rows()
    hits = 0
    for row in rows:
        base5, _escalate = engine.predict(row["text"])
        probs = scaled_probs(base5, temperature)
        if max(probs, key=probs.get) == row["cls"]:
            hits += 1

    accuracy = hits / len(rows)
    assert len(rows) == expected["data"]["d1_test_n"]
    assert accuracy == pytest.approx(expected["systems"]["E1"]["accuracy"], abs=0)


def test_app_scam_head_reproduces_notebook_false_alarm_rate(expected):
    from app.config import SCAM_T
    from app.engines.scam import ScamHead

    head = ScamHead.load()
    assert head.loaded

    rows = _rows()
    flagged = sum(1 for row in rows if head.predict(row["text"]) >= SCAM_T)
    rate = flagged / len(rows)
    assert rate == pytest.approx(expected["scam"]["false_alarm_d1"], abs=0)
    assert expected["scam"]["threshold"] == SCAM_T


def test_pipeline_boots_and_is_honest_without_artifacts(tmp_path, monkeypatch):
    """Degraded mode is a supported state, and it must be reported honestly.

    No artifacts -> flat distribution at 1/5, escalate 0, scam 0. Nothing can
    clear a threshold, so every message goes to review and `model_loaded` is
    false. The app still boots and answers.

    Engine A is forced to its absent state here: on a host that has torch and the
    644 MB checkpoint, `Pipeline.create()` would otherwise start the real Laya
    engine and answer with real probabilities, which is not what this test is
    about (that shape is covered in `test_engine.py`). Booting with nothing is
    the state this test pins down.
    """
    from app import config
    from app.engines import decision as decision_mod
    from app.engines.laya import LayaEngine
    from app.engines import scam as scam_mod
    from app.pipeline import Pipeline

    # The engine modules bind `artifacts_dir` at import time, so every holder of
    # that name has to point at the empty directory.
    for mod in (config, decision_mod, scam_mod):
        monkeypatch.setattr(mod, "artifacts_dir", lambda: tmp_path)
    monkeypatch.setattr(LayaEngine, "load",
                        classmethod(lambda cls, repo=config.LAYA_REPO:
                                    LayaEngine(error="test: not loaded")))
    pipeline = Pipeline.create()

    assert pipeline.model_loaded is False
    assert pipeline.engine_name.startswith("unavailable")

    pred = pipeline.classify("ei saree ta ki stock e ache?", source="test")
    assert pred["lane"] == "review"
    assert pred["scam_prob"] == 0.0
    assert pred["escalate_prob"] == 0.0
    assert pred["top_prob"] == pytest.approx(0.2)      # flat 5-way
    assert pred["route_reason"].startswith("Low confidence")

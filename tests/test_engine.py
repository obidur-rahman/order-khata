"""Engine A — the adopted Laya checkpoint, the backup, and the fallback between
them (docs/04 §2.1).

Nothing here needs torch. The fold from the checkpoint's own answer to our five
classes is pure, and every engine is injected, so this file behaves the same on a
machine that installed only `requirements.txt` (Laya absent -> the backup serves)
and on the one where the 644 MB checkpoint is cached. The single exception is the
real-checkpoint test at the bottom, which skips itself when Laya is not here.
"""
from __future__ import annotations

import importlib.util
import os
import sys

import pytest

from app import config
from app.config import BASE_CLASSES, ENGINE_LAYA, ENGINE_TFIDF, SCAM_T
from app.engines.laya import LayaEngine, flatten_answers
from app.pipeline import Pipeline

FLAT = {c: 1.0 / len(BASE_CLASSES) for c in BASE_CLASSES}
SPREAD = {**{c: 0.0 for c in BASE_CLASSES}, "order": 0.6, "price_question": 0.4}


class StubEngine:
    """Duck-types both S1 engines: `.name`, `.loaded`, `predict_base5`."""

    def __init__(self, name, probs=None, loaded=True, error=None, escalate=0.0):
        self.name = name
        self._probs = dict(FLAT if probs is None else probs)
        self._loaded = loaded
        self.error = error
        self._escalate = escalate
        self.calls = 0

    @property
    def loaded(self) -> bool:
        return self._loaded

    def predict_base5(self, text: str) -> dict[str, float]:
        self.calls += 1
        if self.error is not None:
            raise self.error
        return dict(self._probs)

    def predict_escalate(self, text: str) -> float:
        return self._escalate


class StubScam:
    def __init__(self, p: float = 0.0, loaded: bool = True) -> None:
        self._p = p
        self._loaded = loaded

    @property
    def name(self) -> str:
        return "stub-scam" if self._loaded else "unavailable"

    @property
    def loaded(self) -> bool:
        return self._loaded

    def predict(self, text: str) -> float:
        return self._p


class StubLLM:
    """No provider, no network: the degraded mode the tests must run in."""

    provider = None
    status = "unavailable"

    def call(self, text: str):
        return None, None, "unavailable"


def make_pipeline(laya=None, tfidf=None, scam=None, temperature=1.0, engine=None) -> Pipeline:
    return Pipeline(
        decision=tfidf or StubEngine(ENGINE_TFIDF),
        scam_head=scam or StubScam(),
        llm=StubLLM(),
        temperature=temperature,
        laya=laya or StubEngine(ENGINE_LAYA),
        engine=engine,
    )


# ---------------------------------------------------------------------------
# Configuration: Laya is adopted, the backup is still shipped
# ---------------------------------------------------------------------------
def test_adopted_engine_is_laya_and_the_backup_is_shipped():
    """docs/04 §2.1 — the checkpoint is Engine A; `tfidf-lr` stays selectable."""
    assert config.ENGINE_LAYA in config.ENGINE_CHOICES
    assert config.ENGINE_TFIDF in config.ENGINE_CHOICES
    # ENGINE_A can only ever name a shipped engine, so a typo in a Space secret
    # cannot leave the app advertising (or trying to run) something that is not here.
    assert config.ENGINE_DEFAULT in config.ENGINE_CHOICES
    if not os.environ.get("ENGINE_A", "").strip():
        assert config.ENGINE_DEFAULT == config.ENGINE_LAYA


def test_engine_registry_marks_exactly_one_engine_active():
    p = make_pipeline()
    engines = p.engines()
    assert [e["id"] for e in engines] == list(config.ENGINE_CHOICES)
    assert all(e["available"] for e in engines)
    assert [e["id"] for e in engines if e["active"]] == [p.s1_name]
    assert p.engine_name == p.s1_name


# ---------------------------------------------------------------------------
# The checkpoint's answer -> our five classes (pure, no torch)
# ---------------------------------------------------------------------------
def test_flatten_answers_folds_intents_into_our_classes():
    answers = {
        "intent": {
            "type": "choice",
            "choice": "price_inquiry",
            "probabilities": {"price_inquiry": 0.8, "discount_offer": 0.2},
        }
    }
    probs = flatten_answers(answers)
    assert set(probs) == set(BASE_CLASSES)
    assert probs["price_question"] == pytest.approx(1.0)
    assert sum(probs.values()) == pytest.approx(1.0)
    assert "scam" not in probs  # scam mass comes from the scam head (docs/04 §1)


def test_flatten_answers_uses_the_choice_when_no_probabilities_come_back():
    """A decision head without probabilities still names a class. Believing it at
    certainty beats pretending the model said nothing."""
    probs = flatten_answers({"intent": {"choice": "order_status"}})
    assert probs["delivery_problem"] == pytest.approx(1.0)


def test_flatten_answers_ignores_an_unknown_label_rather_than_guessing():
    """An intent we do not map must contribute nothing — silently filing it under
    `other` would invent confidence the model did not express."""
    probs = flatten_answers({"intent": {"probabilities": {"not_an_intent": 1.0}}})
    assert set(probs) == set(BASE_CLASSES)
    assert sum(probs.values()) == 0.0


def test_flatten_answers_is_all_zero_for_an_empty_answer():
    for answers in ({}, {"intent": None}, {"intent": {"probabilities": {}}}):
        probs = flatten_answers(answers)
        assert set(probs) == set(BASE_CLASSES)
        assert set(probs.values()) == {0.0}


def test_flatten_answers_drops_non_numeric_probabilities():
    """`laya` returns floats today; a string here would otherwise poison every
    downstream sum with no error. The surviving numbers keep their ratio."""
    probs = flatten_answers(
        {
            "intent": {
                "probabilities": {
                    "price_inquiry": 0.5,
                    "complaint": 0.25,
                    "greeting": "0.5",   # not a number -> dropped
                    "thanks": None,        # null -> dropped
                }
            }
        }
    )
    assert probs["price_question"] == pytest.approx(2 / 3)
    assert probs["complaint"] == pytest.approx(1 / 3)
    assert probs["other"] == 0.0  # the dropped greeting/thanks contributed nothing


def test_flatten_answers_absorbs_rounding_noise_but_not_a_dropped_label():
    """The checkpoint's probabilities arrive rounded to 4 decimals (a full answer
    sums to ~0.9998). That gap is rescaled so the 6-class vector stays a
    distribution — but a label we do not recognise leaves its mass out rather than
    handing it to the classes that remain."""
    complete = flatten_answers(
        {"intent": {"probabilities": {"price_inquiry": 0.6001, "discount_offer": 0.3997}}}
    )
    assert sum(complete.values()) == pytest.approx(1.0)

    partial = flatten_answers(
        {"intent": {"probabilities": {"price_inquiry": 0.2, "not_an_intent": 0.8}}}
    )
    assert partial["price_question"] == pytest.approx(0.2)
    assert sum(partial.values()) == pytest.approx(0.2)


# ---------------------------------------------------------------------------
# Loading is optional; absence is a supported state
# ---------------------------------------------------------------------------
def test_missing_package_yields_an_engine_that_says_so(monkeypatch):
    """`import laya` failing must not raise out of `load()` — that would take boot
    down with it."""
    monkeypatch.setitem(sys.modules, "laya", None)  # `import laya` -> ImportError
    engine = LayaEngine.load()
    assert engine.loaded is False
    # The message is kept for the log and for `/api/health`-adjacent debugging, so
    # it must name the failure rather than say "unavailable" and nothing else.
    assert engine.error and "Error" in engine.error and "laya" in engine.error
    assert engine.name == ENGINE_LAYA


def test_unloaded_engine_refuses_to_predict_instead_of_inventing():
    engine = LayaEngine()
    assert engine.loaded is False
    with pytest.raises(RuntimeError):
        engine.predict_base5("ei saree ta ki stock e ache?")


def test_engine_is_loaded_at_boot_not_on_the_first_message(monkeypatch):
    """A checkpoint that only materialises mid-request would make one customer
    wait ~20 s, and a boot that cannot use it should say so at boot."""
    calls = []

    def fake_load(cls, repo=config.LAYA_REPO):
        calls.append(repo)
        return LayaEngine(error="test: not loaded")

    monkeypatch.setattr(LayaEngine, "load", classmethod(fake_load))
    p = Pipeline.create()
    assert calls == [config.LAYA_REPO]
    assert p.s1_name == ENGINE_TFIDF  # fell back, because the checkpoint did not load


def test_a_host_too_small_to_hold_the_checkpoint_is_refused_not_attempted(monkeypatch):
    """A 512 MiB instance (Render's free tier) must be refused, never attempted.

    Loading there does not fail — it OOM-kills the process inside lifespan, so no
    port ever opens and the deploy crash-loops instead of degrading. The refusal
    must name the real cause and stop *before* touching the torch/laya import.
    """
    import app.engines.laya as laya_mod

    monkeypatch.setattr(laya_mod, "total_ram_bytes", lambda: 512 * 1024**2)
    monkeypatch.setitem(sys.modules, "laya", None)  # an import attempt would raise
    engine = LayaEngine.load()
    assert engine.loaded is False
    assert engine.error and "GiB" in engine.error  # says why
    assert "Error" not in engine.error  # proves it never got as far as importing


def test_unknown_host_memory_keeps_the_old_try_and_degrade_behaviour(monkeypatch):
    """A platform that will not answer the probe changes nothing: try to load,
    degrade honestly if the stack or the weights are missing."""
    import app.engines.laya as laya_mod

    monkeypatch.setattr(laya_mod, "total_ram_bytes", lambda: None)
    monkeypatch.setitem(sys.modules, "laya", None)
    engine = LayaEngine.load()
    assert engine.loaded is False
    assert engine.error and "Error" in engine.error


# ---------------------------------------------------------------------------
# The probe itself: a container's cap, not the host board's memory
# ---------------------------------------------------------------------------
def test_cgroup_limit_parsing_takes_a_cap_and_rejects_both_unlimited_sentinels():
    """v2 writes `max` when uncapped; v1 writes ~2**63-1 page-rounded. Neither
    is a RAM size — v1's number in particular would sail through any
    `>= 3 GiB` check if read at face value."""
    from app.engines.laya import parse_cgroup_limit

    assert parse_cgroup_limit("536870912\n") == 536870912      # 512 MiB: Render free
    assert parse_cgroup_limit("max") is None                   # v2, uncapped
    assert parse_cgroup_limit("9223372036854771712") is None   # v1, uncapped
    assert parse_cgroup_limit("0") is None
    assert parse_cgroup_limit("") is None
    assert parse_cgroup_limit("not a number") is None


def test_the_probe_returns_the_cgroup_cap_rather_than_the_board_memory(tmp_path, monkeypatch):
    """The Render failure: sysconf reads the machine the cgroup sits on (many
    GiB) while the container may use 512 MiB. `load()` compares this number
    against 3 GiB, so returning the board's figure here is what handed the
    deploy its OOM kill inside lifespan."""
    import app.engines.laya as laya_mod

    cap = tmp_path / "memory.max"
    cap.write_text("536870912", encoding="ascii")
    monkeypatch.setattr(laya_mod, "CGROUP_LIMIT_FILES", (str(cap),))
    ram = laya_mod.total_ram_bytes()
    assert ram is not None and ram <= 512 * 1024**2


def test_a_512_mib_cgroup_alone_refuses_the_checkpoint_end_to_end(tmp_path, monkeypatch):
    """Through the real `load()`: cap seen -> refusal written before `import
    laya` — the exact boot path a Render free instance walks."""
    import app.engines.laya as laya_mod

    cap = tmp_path / "memory.max"
    cap.write_text("536870912", encoding="ascii")
    monkeypatch.setattr(laya_mod, "CGROUP_LIMIT_FILES", (str(cap),))
    monkeypatch.setitem(sys.modules, "laya", None)  # an import attempt would raise
    engine = LayaEngine.load()
    assert engine.loaded is False
    assert engine.error and "GiB" in engine.error  # says why
    assert "Error" not in engine.error  # never got as far as importing


# ---------------------------------------------------------------------------
# Selection, switching, and the honest fallback
# ---------------------------------------------------------------------------
def test_default_runs_laya_and_the_switch_reaches_the_backup():
    p = make_pipeline(engine=ENGINE_LAYA)
    assert p.s1_name == ENGINE_LAYA
    laya = p.s1
    assert p.set_engine(ENGINE_TFIDF) == ENGINE_TFIDF
    assert p.s1 is not laya
    assert p.classify("ei saree ta ki stock e ache?")["engine"] == ENGINE_TFIDF
    assert p.set_engine(ENGINE_LAYA) == ENGINE_LAYA
    assert p.classify("ei saree ta ki stock e ache?")["engine"] == ENGINE_LAYA


def test_switch_to_an_unknown_engine_is_refused():
    p = make_pipeline()
    with pytest.raises(ValueError):
        p.set_engine("gpt-9")
    assert p.s1_name in config.ENGINE_CHOICES


def test_missing_checkpoint_falls_back_to_the_backup_and_reports_it():
    """The deployed shape on a host without torch: `laya-ft` was requested, the
    backup answers, and every surface that reports the engine says so."""
    p = make_pipeline(laya=StubEngine(ENGINE_LAYA, loaded=False), engine=ENGINE_LAYA)
    assert p.s1_name == ENGINE_TFIDF
    assert p.engine_name == ENGINE_TFIDF
    assert p.model_loaded is True
    assert [e["available"] for e in p.engines()] == [False, True]
    assert [e["id"] for e in p.engines() if e["active"]] == [ENGINE_TFIDF]
    assert p.classify("ei saree ta ki stock e ache?")["engine"] == ENGINE_TFIDF


def test_switch_to_an_unavailable_engine_keeps_the_working_one():
    p = make_pipeline(laya=StubEngine(ENGINE_LAYA, loaded=False), engine=ENGINE_TFIDF)
    assert p.set_engine(ENGINE_LAYA) == ENGINE_TFIDF  # request understood, not honoured
    assert p.classify("hi")["engine"] == ENGINE_TFIDF


def test_a_checkpoint_that_fails_mid_request_never_loses_the_message():
    """A raise inside `predict` must degrade to the backup for that message and
    report the engine that actually answered — not 500 the customer's message."""
    laya = StubEngine(ENGINE_LAYA, error=RuntimeError("boom"), probs=SPREAD)
    tfidf = StubEngine(ENGINE_TFIDF, probs={**{c: 0.0 for c in BASE_CLASSES}, "order": 1.0})
    p = make_pipeline(laya=laya, tfidf=tfidf, engine=ENGINE_LAYA)
    pred = p.classify("ei saree ta ki stock e ache?")
    assert pred["engine"] == ENGINE_TFIDF
    assert pred["top_class"] == "order"
    assert tfidf.calls == 1


def test_degraded_mode_still_boots_and_reviews_everything():
    p = make_pipeline(
        laya=StubEngine(ENGINE_LAYA, probs=None, loaded=False),
        tfidf=StubEngine(ENGINE_TFIDF, probs=None, loaded=False),
        scam=StubScam(loaded=False),
    )
    assert p.model_loaded is False
    assert p.engine_name.startswith("unavailable")
    pred = p.classify("ei saree ta ki stock e ache?")
    assert pred["lane"] == "review"
    assert pred["top_prob"] == pytest.approx(0.2)


def test_use_llm_false_is_exactly_the_degraded_prediction():
    """Seeding runs under a wall-clock budget (docs/04 §3.1). Skipping the
    second signal must produce the degraded-mode shape — status
    `unavailable`, no class — while every local signal is answered, and the
    LLM must not be touched at all."""

    class RecordingLLM:
        provider = "stub"
        status = "ok"

        def __init__(self):
            self.seen = []

        def call(self, text):
            self.seen.append(text)
            return "order", "restock", "ok"

    p = make_pipeline()
    llm = RecordingLLM()
    p.llm = llm

    skipped = p.classify("ei saree ta ki stock e ache?", use_llm=False)
    assert llm.seen == []
    assert skipped["llm_status"] == "unavailable"
    assert skipped["llm_class"] is None and skipped["llm_reason"] is None
    assert skipped["top_class"] and skipped["lane"]  # local signals still answered

    asked = p.classify("restock korte chai")
    assert len(llm.seen) == 1  # the default still asks, exactly once
    assert asked["llm_status"] == "ok" and asked["llm_class"] == "order"


# ---------------------------------------------------------------------------
# The two engine-dependent rules docs/04 §2.1 pins down
# ---------------------------------------------------------------------------
def test_temperature_belongs_to_the_tfidf_model_and_not_to_the_checkpoint():
    """The scalar is fitted on the baseline's validation rows. Applying it to the
    checkpoint's probabilities would be another model's correction — a made-up
    number — so S1 must return the checkpoint's own distribution untouched."""
    laya = StubEngine(ENGINE_LAYA, probs=SPREAD)
    tfidf = StubEngine(ENGINE_TFIDF, probs=SPREAD)
    p = make_pipeline(laya=laya, tfidf=tfidf, temperature=5.0, engine=ENGINE_TFIDF)
    tfidf_pred = p.classify("x")
    assert tfidf_pred["top_prob"] < 0.6  # flattened towards uniform by T = 5

    p.set_engine(ENGINE_LAYA)
    laya_pred = p.classify("x")
    assert laya_pred["top_prob"] == pytest.approx(0.6)
    assert laya_pred["class_probs"]["price_question"] == pytest.approx(0.4)


def test_the_checkpoints_own_escalate_answer_does_not_move_S2():
    """S2 stays on the calibrated TF-IDF head whichever engine drives S1: the
    published ESCALATE_T = 0.20 was fitted for it (docs/04 §2.1)."""
    head = StubEngine(ENGINE_TFIDF, escalate=0.42)
    p = make_pipeline(laya=StubEngine(ENGINE_LAYA), tfidf=head, engine=ENGINE_LAYA)
    assert p.classify("ei saree ta ki stock e ache?")["escalate_prob"] == pytest.approx(0.42)


def test_scam_invariant_holds_on_laya_signals():
    """AGENTS.md: scam_prob >= SCAM_T -> never `auto`, and the checkpoint's arrival
    must not have opened a route around that rule."""
    laya = StubEngine(ENGINE_LAYA, probs={**{c: 0.0 for c in BASE_CLASSES}, "order": 1.0})
    p = make_pipeline(laya=laya, scam=StubScam(p=SCAM_T), engine=ENGINE_LAYA)
    pred = p.classify("prize! send the OTP now")
    assert pred["scam_prob"] == pytest.approx(SCAM_T)
    assert pred["lane"] == "scam"
    assert pred["lane"] != "auto"
    # The 6-class vector stays a distribution: scam mass comes out of the others.
    assert sum(pred["class_probs"].values()) == pytest.approx(1.0)
    assert pred["class_probs"]["scam"] == pytest.approx(pred["scam_prob"])


def test_a_confident_conversational_message_from_the_checkpoint_can_still_auto():
    """The fallback must not be the only engine that can clear a threshold — a
    confident, non-escalating, non-scam call still auto-resolves."""
    laya = StubEngine(ENGINE_LAYA, probs={"other": 0.95, **{c: 0.0 for c in BASE_CLASSES if c != "other"}})
    p = make_pipeline(laya=laya, engine=ENGINE_LAYA)
    pred = p.classify("thank you vai")
    assert pred["engine"] == ENGINE_LAYA
    assert pred["lane"] == "auto"


# ---------------------------------------------------------------------------
# The real checkpoint (skipped wherever Laya is not installed)
# ---------------------------------------------------------------------------
laya_installed = importlib.util.find_spec("laya") is not None


@pytest.mark.skipif(not laya_installed, reason="laya/torch not installed here (the backup serves)")
def test_real_checkpoint_answers_bangla_banglish_and_english():
    """End-to-end against `nafiullah/laya-multilingual-bn-ecom-voice`.

    Expected classes were read off the checkpoint before being written down, and
    the floor is deliberately loose (0.5, not the measured 0.9) so the test fails
    on a wrong answer rather than on a benign numeric drift.
    """
    engine = LayaEngine.load()
    if not engine.loaded:
        pytest.skip(f"checkpoint unavailable: {engine.error}")

    cases = (
        ("ei saree ta ki stock e ache?", "order"),            # Banglish
        ("আমার অর্ডারটা কখন ডেলিভার হবে?", "delivery_problem"),  # Bangla
        ("সারির দাম কত?", "price_question"),                   # Bangla
        ("thank you vai", "other"),                            # Banglish
    )
    for text, expected in cases:
        probs = engine.predict_base5(text)
        assert set(probs) == set(BASE_CLASSES)
        assert sum(probs.values()) == pytest.approx(1.0, abs=1e-6)
        top = max(probs, key=probs.get)
        assert top == expected, f"{text!r} -> {top} ({probs})"
        assert probs[top] >= 0.5


@pytest.mark.skipif(not laya_installed, reason="laya/torch not installed here (the backup serves)")
def test_real_checkpoint_drives_the_whole_pipeline():
    """The signals the router sees when Laya answers: 5 base classes plus the
    TF-IDF scam head, routed without an LLM present."""
    engine = LayaEngine.load()
    if not engine.loaded:
        pytest.skip(f"checkpoint unavailable: {engine.error}")
    p = Pipeline(decision=pipeline_decision(), scam_head=pipeline_scam(),
                 llm=StubLLM(), laya=engine, engine=ENGINE_LAYA)
    if not p.model_loaded:
        pytest.skip("TF-IDF artifacts not built (run the notebook)")

    pred = p.classify("ei saree ta ki stock e ache?")
    assert pred["engine"] == ENGINE_LAYA
    assert pred["top_class"] == "order"
    assert set(pred["class_probs"]) == set(config.CLASSES)
    assert sum(pred["class_probs"].values()) == pytest.approx(1.0)
    assert pred["lane"] in ("auto", "review", "scam")


def pipeline_decision():
    from app.engines.decision import DecisionEngine

    return DecisionEngine.load()


def pipeline_scam():
    from app.engines.scam import ScamHead

    return ScamHead.load()

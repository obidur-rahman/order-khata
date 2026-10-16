"""API schema tests (AGENTS.md) — docs/05 endpoint contracts, including the
400/404/429/503 error contract."""
from __future__ import annotations

from pathlib import Path

import pytest

from app import config
from app.router import required_threshold

BANGLISH = "ei saree ta ki stock e ache?"      # script bl, class order
BANGLA = "সারির দাম কত?"                        # script bn, class price
ENGLISH = "Where is my order? It has not been delivered yet."  # script en

ARTIFACTS = Path(__file__).resolve().parents[1] / "backend" / "artifacts"
TRAINED = ("decision_tfidf.joblib", "escalate_tfidf.joblib", "scam_head.joblib")


def artifacts_built() -> bool:
    """The .joblib files are gitignored: a fresh clone legitimately has none."""
    return all((ARTIFACTS / name).exists() for name in TRAINED)


def test_health_schema(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"status", "model_loaded", "llm_provider", "llm_status", "version"}
    assert body["status"] == "ok"
    # Honesty: `model_loaded` reports the artifacts, not the uptime. The app boots
    # and serves without them (degraded), so the flag must not be a constant.
    assert body["model_loaded"] is artifacts_built()
    assert body["llm_status"] in ("ok", "unavailable")
    assert body["version"] == config.VERSION


def test_config_schema(client):
    body = client.get("/api/config").json()
    assert body["tau_default"] == 0.85
    assert body["tau_min"] == 0.50
    assert body["tau_max"] == 0.99
    assert body["tau_other_offset"] == 0.20
    # These three are the values the router actually enforces, and the frontend's
    # lib/route.ts mirrors them (tests/test_parity.py keeps the pair honest).
    assert body["scam_t"] == config.SCAM_T == 0.70
    assert body["escalate_t"] == config.ESCALATE_T == 0.20
    assert body["decisive_t"] == config.DECISIVE_T == 0.90
    assert body["classes"] == list(config.CLASSES)
    assert set(body["class_meta"]) == set(config.CLASSES)
    for meta in body["class_meta"].values():
        assert meta["label"] and meta["color"].startswith("#")


def test_post_message_full_record(client):
    r = client.post("/api/messages", json={"text": BANGLISH, "sender_name": "Rina"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {
        "id", "conversation_id", "sender_name", "text", "script", "source",
        "received_at", "prediction", "resolution",
    }
    assert body["id"].startswith("m_")
    assert body["conversation_id"].startswith("c_")
    assert body["sender_name"] == "Rina"
    assert body["script"] == "bl"
    assert body["source"] == "user"
    assert body["resolution"] is None

    pred = body["prediction"]
    assert set(pred) == {
        "class_probs", "top_class", "top_prob", "scam_prob", "escalate_prob",
        "llm_class", "llm_reason", "llm_status", "engine", "latency_ms",
        "lane", "route_reason",
    }
    assert set(pred["class_probs"]) == set(config.CLASSES)
    assert abs(sum(pred["class_probs"].values()) - 1.0) < 1e-6
    assert pred["top_class"] in config.CLASSES
    assert pred["lane"] in ("auto", "review", "scam")
    assert pred["llm_status"] in ("ok", "unavailable")
    assert isinstance(pred["latency_ms"], int)


def test_scripts_detected_for_three_languages(client):
    script_by_text = {}
    for text in (BANGLISH, BANGLA, ENGLISH):
        r = client.post("/api/messages", json={"text": text})
        assert r.status_code == 200, r.text
        script_by_text[text] = r.json()["script"]
    assert script_by_text[BANGLISH] == "bl"
    assert script_by_text[BANGLA] == "bn"
    assert script_by_text[ENGLISH] == "en"


def test_empty_text_400(client):
    assert client.post("/api/messages", json={"text": ""}).status_code == 400
    assert client.post("/api/messages", json={"text": "   "}).status_code == 400


def test_too_long_text_400(client):
    assert client.post("/api/messages", json={"text": "x" * 1001}).status_code == 400
    assert client.post("/api/messages", json={"text": "x" * 1000}).status_code == 200


def test_rate_limit_429(client, monkeypatch):
    monkeypatch.setattr(config, "RATE_LIMIT_PER_MIN", 2)
    assert client.post("/api/messages", json={"text": "hello"}).status_code == 200
    assert client.post("/api/messages", json={"text": "hello"}).status_code == 200
    assert client.post("/api/messages", json={"text": "hello"}).status_code == 429


def test_warming_up_503(client):
    client.app.state.pipeline.ready = False
    r = client.post("/api/messages", json={"text": "hello there"})
    assert r.status_code == 503
    assert r.json()["detail"] == "warming_up"
    client.app.state.pipeline.ready = True


def test_inbox_and_conversation(client):
    mid = client.post("/api/messages", json={"text": BANGLISH}).json()["id"]

    r = client.get("/api/inbox")
    assert r.status_code == 200
    convs = r.json()
    assert len(convs) >= 1
    conv = convs[0]
    assert set(conv) == {"id", "customer_name", "avatar_color", "created_at", "last_message", "messages"}
    assert conv["last_message"]["id"] == mid
    assert conv["last_message"]["prediction"]["lane"] in ("auto", "review", "scam")

    detail = client.get(f"/api/conversations/{conv['id']}")
    assert detail.status_code == 200
    assert any(m["id"] == mid for m in detail.json()["messages"])

    assert client.get("/api/conversations/c_999").status_code == 404
    assert client.get("/api/inbox?lane=bogus").status_code == 400


def test_lane_filter(client):
    client.post("/api/messages", json={"text": ENGLISH})
    assert client.get("/api/inbox?lane=all").status_code == 200
    for lane in ("auto", "review", "scam"):
        body = client.get(f"/api/inbox?lane={lane}").json()
        assert all(c["last_message"]["prediction"]["lane"] == lane for c in body)


def test_resolve_flow(client):
    mid = client.post("/api/messages", json={"text": BANGLA}).json()["id"]

    r = client.post(f"/api/messages/{mid}/resolve", json={"label": "price_question"})
    assert r.status_code == 200
    assert r.json()["resolution"] == {
        "human_label": "price_question",
        "resolved_at": r.json()["resolution"]["resolved_at"],
    }

    assert client.post(f"/api/messages/{mid}/resolve", json={"label": "nope"}).status_code == 400
    assert client.post("/api/messages/m_999999/resolve", json={"label": "order"}).status_code == 404


def test_stats_schema(client):
    client.post("/api/messages", json={"text": BANGLISH})
    body = client.get("/api/stats").json()
    assert set(body) == {
        "total", "lanes", "classes", "histogram", "auto_count",
        "seconds_per_message", "time_saved_s",
    }
    assert body["total"] >= 1
    assert set(body["lanes"]) == {"auto", "review", "scam"}
    assert len(body["histogram"]) == 10
    assert body["seconds_per_message"] == 20
    assert body["time_saved_s"] == body["auto_count"] * 20


def test_eval_serves_the_real_artifact_or_404(client, monkeypatch, tmp_path):
    """docs/07 §5: every displayed number comes from backend/artifacts/eval.json.

    Two honest states only — the measured artifact, or a 404. Never fabricated
    zeros (AGENTS.md honesty rules).
    """
    r = client.get("/api/eval")
    if artifacts_built():
        assert r.status_code == 200
        body = r.json()
        assert body["generated_at"], "eval.json must carry the run timestamp"
        assert {"B1", "E1", "E3"} <= set(body["systems"])
        assert body["limitations"], "limitations are required, not optional"
    else:
        assert r.status_code == 404

    # With no artifact directory at all the endpoint must refuse, not invent.
    monkeypatch.setattr(config, "artifacts_dir", lambda: tmp_path)
    r = client.get("/api/eval")
    assert r.status_code == 404
    assert r.json()["detail"] == "eval_not_available"


def test_simulator_start_stop(client):
    """The simulator must actually start when a seed pool exists.

    It used to raise "no running event loop": `Simulator.start()` calls
    `asyncio.create_task`, and a *sync* FastAPI endpoint runs in a worker thread,
    which has no loop. It only bit when a pool existed, because an empty pool
    returns before touching asyncio.
    """
    sim = client.app.state.simulator
    if not sim.pool:
        pytest.skip("no seed pool in this checkout")
    r = client.post("/api/simulator", json={"running": True, "interval_s": 6})
    assert r.status_code == 200, r.text
    assert r.json() == {"running": True, "interval_s": 6.0}
    r = client.post("/api/simulator", json={"running": False})
    assert r.status_code == 200
    assert r.json()["running"] is False


def test_simulator_inert_without_pool(client, monkeypatch):
    monkeypatch.setattr(client.app.state.simulator, "pool", [])
    r = client.post("/api/simulator", json={"running": True})
    assert r.status_code == 200
    assert r.json()["running"] is False  # nothing to replay -> gracefully inert


@pytest.mark.skipif(not artifacts_built(), reason="trained artifacts not built (run the notebook)")
def test_predict_classifies_order_message(client):
    pred = client.post("/api/messages", json={"text": BANGLISH}).json()["prediction"]
    assert pred["engine"] == "tfidf-lr"
    assert pred["top_class"] == "order"
    assert 0.0 < pred["top_prob"] <= 1.0

    # In tests the provider keys are cleared, so the LLM is unavailable, rule 4 is
    # skipped and the stricter degraded bar applies (docs/04 §4).
    assert pred["llm_status"] == "unavailable"
    assert pred["lane"] != "scam" and pred["scam_prob"] < config.SCAM_T


def test_predict_lane_matches_its_own_thresholds(client):
    """No artifact, no key, no matter: the stored lane must be exactly what the
    stored signals imply. This is the contract the frontend re-derives when the
    slider moves, so a disagreement here would be a real bug."""
    pred = client.post("/api/messages", json={"text": BANGLISH}).json()["prediction"]
    assert pred["lane"] in ("auto", "review", "scam")

    always_blocks = (pred["scam_prob"] >= config.SCAM_T
                     or pred["escalate_prob"] >= config.ESCALATE_T)
    bar = required_threshold(pred["top_class"], config.TAU_DEFAULT,
                             pred["llm_status"] == "unavailable")
    vetoed = (pred["llm_status"] == "ok" and pred["llm_class"] is not None
              and pred["llm_class"] != pred["top_class"]
              and pred["top_prob"] < config.DECISIVE_T)
    could_be_auto = pred["top_prob"] >= bar and not always_blocks and not vetoed
    assert (pred["lane"] == "auto") is bool(could_be_auto)


def test_prediction_field_set_is_the_documented_contract():
    """docs/05: the Prediction field set is a contract with the frontend."""
    from app.schemas import Prediction

    model = Prediction(
        class_probs={c: (1.0 if c == "order" else 0.0) for c in config.CLASSES},
        top_class="order", top_prob=0.93, scam_prob=0.02, escalate_prob=0.0,
        llm_class="order", llm_reason="all engines agree", llm_status="ok",
        engine="tfidf-lr", latency_ms=12, lane="auto",
        route_reason="Confident and second opinion agrees",
    )
    assert set(Prediction.model_fields) == {
        "class_probs", "top_class", "top_prob", "scam_prob", "escalate_prob",
        "llm_class", "llm_reason", "llm_status", "engine", "latency_ms",
        "lane", "route_reason",
    }
    assert model.top_class == "order" and model.lane == "auto"


def test_response_models_accept_the_artifact_shapes():
    """The eval payload the notebook writes must validate against EvalResponse."""
    import json as _json
    from app.schemas import EvalResponse

    path = ARTIFACTS / "eval.json"
    if not path.exists():
        pytest.skip("no eval.json yet")
    payload = _json.loads(path.read_text(encoding="utf-8"))
    model = EvalResponse(**payload)
    assert model.systems and model.limitations

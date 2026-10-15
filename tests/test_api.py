"""API schema tests (AGENTS.md) — docs/05 endpoint contracts, including the
400/404/429/503 error contract."""
from __future__ import annotations

from app import config

BANGLISH = "ei saree ta ki stock e ache?"      # script bl, class order
BANGLA = "সারির দাম কত?"                        # script bn, class price
ENGLISH = "Where is my order? It has not been delivered yet."  # script en


def test_health_schema(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"status", "model_loaded", "llm_provider", "llm_status", "version"}
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["llm_status"] in ("ok", "unavailable")
    assert body["version"] == config.VERSION


def test_config_schema(client):
    body = client.get("/api/config").json()
    assert body["tau_default"] == 0.85
    assert body["tau_min"] == 0.50
    assert body["tau_max"] == 0.99
    assert body["tau_other_offset"] == 0.20
    assert body["scam_t"] == 0.50
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


def test_eval_returns_honest_placeholder(client):
    r = client.get("/api/eval")
    assert r.status_code == 200
    body = r.json()
    assert body["generated_at"] is None
    assert any("NOT YET EVALUATED" in lim for lim in body["limitations"])
    assert body["systems"] == {}  # no fabricated numbers (AGENTS.md honesty rules)


def test_simulator_start_stop_without_seed(client):
    r = client.post("/api/simulator", json={"running": True, "interval_s": 6})
    assert r.status_code == 200
    assert r.json()["running"] is False  # no seed pool -> gracefully inert
    assert client.post("/api/simulator", json={"running": False}).status_code == 200


def test_predict_classifies_order_message(client):
    pred = client.post("/api/messages", json={"text": BANGLISH}).json()["prediction"]
    assert pred["top_class"] == "order"
    # No provider keys configured in tests -> degraded mode (docs/04 §4):
    # second signal unavailable, stricter threshold applies.
    assert pred["llm_status"] == "unavailable"
    assert pred["lane"] == "review"
    assert pred["route_reason"].startswith("Low confidence")

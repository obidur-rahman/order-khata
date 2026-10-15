"""LLM second-signal tests (docs/04 §3.1): degraded mode without keys,
JSON-only contract, LRU cache, provider fallback. Network is mocked."""
from __future__ import annotations

import json

import httpx
import pytest

from app.engines import llm as llm_mod


class FakeResp:
    def __init__(self, status_code: int, payload=None, raw_text: str | None = None):
        self.status_code = status_code
        self._payload = payload
        self._raw = raw_text

    def json(self):
        if self._payload is not None:
            return self._payload
        return json.loads(self._raw)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=httpx.Request("POST", "http://x"), response=None)


@pytest.fixture(autouse=True)
def no_keys(monkeypatch):
    # Clear every key source, including a real repo-root .env and the
    # plural rotation variable, so no test can reach a live provider.
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)


def _groq_payload(content: str) -> dict:
    return {"choices": [{"message": {"content": content}}]}


def test_unavailable_without_keys_never_calls_network(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("network must not be touched without keys")

    monkeypatch.setattr(llm_mod.httpx, "post", boom)
    client = llm_mod.LLMClient()
    assert client.status == "unavailable"
    assert client.call("some text") == (None, None, "unavailable")
    assert client.provider is None


def test_valid_json_parsed_and_cached(monkeypatch):
    calls = {"n": 0}

    def post(url, **kwargs):
        calls["n"] += 1
        return FakeResp(200, _groq_payload('{"class": "order", "reason": "Asks if an item is in stock."}'))

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setattr(llm_mod.httpx, "post", post)
    client = llm_mod.LLMClient()

    first = client.call("ei saree ta ki stock e ache?")
    assert first == ("order", "Asks if an item is in stock.", "ok")
    assert client.provider == "groq"
    assert client.status == "ok"

    second = client.call("ei saree ta ki stock e ache?")
    assert second == first
    assert calls["n"] == 1, "second identical call must come from cache"


def test_fenced_json_and_invalid_content(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    client = llm_mod.LLMClient()

    monkeypatch.setattr(
        llm_mod.httpx, "post",
        lambda *a, **k: FakeResp(200, _groq_payload('```json\n{"class": "scam", "reason": "Advance payment demand."}\n```')),
    )
    assert client.call("fenced") == ("scam", "Advance payment demand.", "ok")

    # invalid class -> unavailable
    monkeypatch.setattr(
        llm_mod.httpx, "post",
        lambda *a, **k: FakeResp(200, _groq_payload('{"class": "banana", "reason": "x"}')),
    )
    assert client.call("bad class") == (None, None, "unavailable")

    # not JSON at all -> unavailable
    monkeypatch.setattr(
        llm_mod.httpx, "post",
        lambda *a, **k: FakeResp(200, raw_text="I think this is an order message."),
    )
    assert client.call("prose") == (None, None, "unavailable")


def test_groq_429_falls_back_to_gemini(monkeypatch):
    seen: list[str] = []

    def post(url, **kwargs):
        if "groq" in url:
            seen.append("groq")
            return FakeResp(429)
        seen.append("gemini")
        return FakeResp(200, {"candidates": [{"content": {"parts": [{"text": '{"class": "complaint", "reason": "Damaged item reported."}'}]}}]})

    monkeypatch.setenv("GROQ_API_KEY", "g1")
    monkeypatch.setenv("GROQ_MODELS", "single/model")
    monkeypatch.setenv("GEMINI_API_KEY", "g2")
    monkeypatch.setattr(llm_mod.httpx, "post", post)
    client = llm_mod.LLMClient()

    assert client.call("broken item") == ("complaint", "Damaged item reported.", "ok")
    assert seen == ["groq", "gemini"]
    assert client.provider == "gemini"


def test_network_error_returns_unavailable(monkeypatch):
    def post(*a, **k):
        raise httpx.ConnectError("boom")

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setattr(llm_mod.httpx, "post", post)
    client = llm_mod.LLMClient()
    assert client.call("hello") == (None, None, "unavailable")


def test_groq_api_keys_rotation_on_429(monkeypatch):
    """GROQ_API_KEYS is comma-separated: 429 on key 1 must rotate to key 2."""
    used: list[str] = []

    def post(url, **kwargs):
        used.append(kwargs["headers"]["Authorization"])
        if len(used) == 1:
            return FakeResp(429)
        return FakeResp(200, _groq_payload('{"class": "order", "reason": "Restock request."}'))

    monkeypatch.setenv("GROQ_API_KEYS", " key-one, key-two ,,key-three ")
    monkeypatch.setattr(llm_mod.httpx, "post", post)
    client = llm_mod.LLMClient()

    assert client.call("restock please") == ("order", "Restock request.", "ok")
    assert used == ["Bearer key-one", "Bearer key-two"]
    assert client.provider == "groq"


def test_each_key_becomes_its_own_provider_entry(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "k1,k2,k3")
    monkeypatch.setenv("GROQ_MODELS", "m1")  # isolate key behavior
    providers = llm_mod.LLMClient()._providers()
    assert len(providers) == 3
    assert {name for name, _, _ in providers} == {"groq"}
    auths = [cfg["Authorization"] for _, _, cfg in providers]
    assert auths == ["Bearer k1", "Bearer k2", "Bearer k3"]


def test_model_major_key_minor_order(monkeypatch):
    """Entries rotate keys for model 1 first, then model 2 (docs/04 §3.1)."""
    monkeypatch.setenv("GROQ_API_KEYS", "k1,k2")
    monkeypatch.setenv("GROQ_MODELS", "mA,mB")
    providers = llm_mod.LLMClient()._providers()
    combos = [(cfg["json"]["model"], cfg["Authorization"]) for _, _, cfg in providers]
    assert combos == [("mA", "Bearer k1"), ("mA", "Bearer k2"), ("mB", "Bearer k1"), ("mB", "Bearer k2")]


def test_removed_model_falls_through_to_next_model(monkeypatch):
    """Regression: llama-3.1-8b-instant vanished from Groq (404) and broke the
    second signal. A model_not_found must try the next candidate model."""
    seen: list[str] = []

    def post(url, **kwargs):
        model = kwargs["json"]["model"]
        seen.append(model)
        if model == "gone/model":
            return FakeResp(404)
        return FakeResp(200, _groq_payload('{"class": "delivery_problem", "reason": "Asks about shipping."}'))

    monkeypatch.setenv("GROQ_API_KEYS", "k1")
    monkeypatch.setenv("GROQ_MODELS", "gone/model,good/model")
    monkeypatch.setattr(llm_mod.httpx, "post", post)
    client = llm_mod.LLMClient()

    assert client.call("where is my order") == ("delivery_problem", "Asks about shipping.", "ok")
    assert seen == ["gone/model", "gone/model", "good/model"]  # one retry, then next model
    assert client.provider == "groq"


def test_singular_key_still_works(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "only-one")
    monkeypatch.setenv("GROQ_MODELS", "m1")  # isolate key behavior
    providers = llm_mod.LLMClient()._providers()
    assert len(providers) == 1
    assert providers[0][2]["Authorization"] == "Bearer only-one"


def test_no_keys_means_no_providers(monkeypatch):
    assert llm_mod.LLMClient()._providers() == []
    assert llm_mod.LLMClient().status == "unavailable"


def test_prompt_contract(monkeypatch):
    """System prompt must pin the six classes and JSON-only output (docs/04 §3.1)."""
    captured = {}

    def post(url, **kwargs):
        captured.update(kwargs)
        return FakeResp(200, _groq_payload('{"class": "other", "reason": "Greeting."}'))

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setattr(llm_mod.httpx, "post", post)
    llm_mod.LLMClient().call("hi there")

    system = captured["json"]["messages"][0]["content"]
    for cls in ("order", "price_question", "delivery_problem", "complaint", "scam", "other"):
        assert cls in system
    assert "JSON only" in system
    assert captured["json"]["temperature"] == 0
    assert captured["json"]["max_tokens"] == 80
    # the user turn must carry the ACTUAL message (regression: an unfilled
    # placeholder made the LLM answer "No message content provided")
    assert captured["json"]["messages"][1] == {"role": "user", "content": "hi there"}

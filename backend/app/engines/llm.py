"""Second signal (S4) — Groq -> Gemini -> none (docs/04 §3.1).

Contract: temperature 0, max 80 tokens, 3 s timeout, one retry, JSON-only
output {"class", "reason"}; the LLM never sees the decision model's answer.
Cache: in-memory LRU keyed by SHA-256 of the normalized text. No API keys in
code — environment variables only; with no keys configured the client is
immediately "unavailable", which is exactly the degraded mode.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from collections import OrderedDict
from typing import Any, Optional

import httpx

from ..config import (
    CLASSES,
    GEMINI_MODEL,
    GROQ_MODEL,
    LLM_CACHE_SIZE,
    LLM_MAX_TOKENS,
    LLM_TIMEOUT_S,
)

_SYSTEM_PROMPT = (
    "Classify a customer message sent to an online shop in Bangladesh into "
    "exactly one of order, price_question, delivery_problem, complaint, scam, "
    "other. The message may be Bangla, Banglish or English. "
    'Answer with JSON only: {"class": "<one of the six>", '
    '"reason": "<max 15 words, English>"}'
)

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.S)


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    """Strip code fences, parse, validate against the class enum (docs/04 §3.1)."""
    m = _FENCE_RE.search(text)
    raw = m.group(1) if m else text
    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        data = json.loads(raw[start:end])
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict) or data.get("class") not in CLASSES:
        return None
    reason = data.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        return None
    return {"class": data["class"], "reason": reason.strip()}


class LLMClient:
    """Provider chain with LRU cache. Usable with zero keys (degraded)."""

    def __init__(self) -> None:
        self._cache: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self.last_provider: Optional[str] = None

    # -- providers ---------------------------------------------------------
    def _providers(self) -> list[tuple[str, str, dict[str, Any]]]:
        out: list[tuple[str, str, dict[str, Any]]] = []
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            out.append((
                "groq",
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    "Authorization": f"Bearer {groq_key}",
                    "json": {
                        "model": GROQ_MODEL,
                        "temperature": 0,
                        "max_tokens": LLM_MAX_TOKENS,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {"role": "system", "content": _SYSTEM_PROMPT},
                            {"role": "user", "content": "<<MSG>>"},
                        ],
                    },
                },
            ))
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            out.append((
                "gemini",
                "https://generativelanguage.googleapis.com/v1beta/models/"
                + GEMINI_MODEL
                + f":generateContent?key={gemini_key}",
                {
                    "json": {
                        "generationConfig": {"temperature": 0, "maxOutputTokens": LLM_MAX_TOKENS},
                        "contents": [{"parts": [{"text": "<<MSG>>"}]}],
                        "systemInstruction": {"parts": [{"text": _SYSTEM_PROMPT}]},
                    },
                },
            ))
        return out

    @staticmethod
    def _extract_text(provider: str, payload: dict[str, Any]) -> str:
        if provider == "groq":
            return payload["choices"][0]["message"]["content"]
        return payload["candidates"][0]["content"]["parts"][0]["text"]

    @property
    def provider(self) -> Optional[str]:
        return self.last_provider

    @property
    def status(self) -> str:
        return "ok" if self._providers() else "unavailable"

    # -- call --------------------------------------------------------------
    def call(self, text: str) -> tuple[Optional[str], Optional[str], str]:
        """Returns (llm_class, llm_reason, status). Never raises."""
        key = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if key in self._cache:
            self._cache.move_to_end(key)
            hit = self._cache[key]
            return hit["class"], hit["reason"], "ok"

        providers = self._providers()
        if not providers:
            return None, None, "unavailable"

        for name, url, cfg in providers:
            for _attempt in range(2):  # one retry (docs/04 §3.1)
                try:
                    resp = httpx.post(
                        url,
                        json=cfg["json"],
                        headers={k: v for k, v in cfg.items() if k != "json"},
                        timeout=LLM_TIMEOUT_S,
                    )
                    if resp.status_code in (429,) or resp.status_code >= 500:
                        break  # switch provider (docs/04 §3.1)
                    resp.raise_for_status()
                    parsed = _extract_json(self._extract_text(name, resp.json()))
                    if parsed:
                        self.last_provider = name
                        self._cache[key] = parsed
                        while len(self._cache) > LLM_CACHE_SIZE:
                            self._cache.popitem(last=False)
                        return parsed["class"], parsed["reason"], "ok"
                    break  # invalid JSON -> do not retry same provider
                except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
                    continue  # retry once, then next provider
        return None, None, "unavailable"

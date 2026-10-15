"""Shared test fixtures: isolated temp DB per test, clean rate-limit state."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
for p in (str(BACKEND), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    """Point the app at a fresh SQLite file for each test."""
    monkeypatch.setenv("DOKANBOX_DB", str(tmp_path / "test.db"))
    return tmp_path / "test.db"


@pytest.fixture()
def client(tmp_db, monkeypatch):
    from fastapi.testclient import TestClient

    from app import db as app_db
    from app.main import app
    from app.api import messages as messages_api

    # Deterministic degraded mode: tests must never touch a real provider.
    # (A real .env may exist at the repo root — clear every key source.)
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    messages_api._hits.clear()  # rate-limit state is module-level
    app_db.init_db()
    with TestClient(app) as c:
        yield c
    messages_api._hits.clear()

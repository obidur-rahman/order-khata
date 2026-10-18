"""Shared test fixtures: isolated temp DB per test, clean rate-limit state."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
for p in (str(BACKEND), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

FIXTURES = Path(__file__).parent / "fixtures"

# Tests must not inherit the developer's machine choices: `config` reads both of
# these once, at import, from the environment or the repo's own .env — and this
# module is imported before any test module, so this is the one place to pin them.
# `ENGINE_A` is *set* rather than deleted on purpose: `config._load_dotenv` only
# fills keys that are absent, so deleting it would let a local `.env` containing
# `ENGINE_A=laya-ft` make the suite boot a 1.3 GB checkpoint and answer
# differently from machine to machine. Empty is not a shipped id, so the default
# in the suite is the backup, exactly as on a fresh clone.
os.environ["ENGINE_A"] = ""
os.environ["LAYA_ENABLED"] = "1"   # enabled by default; tests opt out explicitly


@pytest.fixture()
def tmp_db(tmp_path, monkeypatch):
    """Point the app at a fresh SQLite file for each test."""
    monkeypatch.setenv("ORDER_KHATA_DB", str(tmp_path / "test.db"))
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

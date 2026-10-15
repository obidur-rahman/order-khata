"""Parity test — docs/04 §5: Python router.py and TypeScript route.ts must
produce identical output for the same fixture file.

Runs: node frontend/lib/parity_runner.ts tests/fixtures/route_cases.json
The subprocess exit status is asserted before parsing stdout (exit status is
never filtered away).
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from app.router import required_threshold, route

from conftest import FIXTURES

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "frontend" / "lib" / "parity_runner.ts"


def _python_results():
    with open(FIXTURES / "route_cases.json", encoding="utf-8") as f:
        cases = json.load(f)
    out = []
    for case in cases:
        signals = case["signals"]
        tau = case.get("tau", 0.85)
        lane, reason = route(signals, tau)
        degraded = (signals.get("llm_status") or "unavailable") != "ok" or not signals.get("llm_class")
        req = required_threshold(signals["top_class"], tau, degraded)
        out.append({"name": case["name"], "lane": lane, "reason": reason, "req": req})
    return out


def test_typescript_matches_python():
    node = shutil.which("node")
    if node is None:
        pytest.skip("node not available; TS parity cannot run on this machine")
    assert RUNNER.exists(), f"missing parity runner: {RUNNER}"

    proc = subprocess.run(
        [node, str(RUNNER), str(FIXTURES / "route_cases.json")],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=ROOT,
    )
    assert proc.returncode == 0, f"parity runner failed:\nstdout={proc.stdout}\nstderr={proc.stderr}"

    ts_results = json.loads(proc.stdout)
    py_results = _python_results()
    assert len(ts_results) == len(py_results) > 0
    for ts, py in zip(ts_results, py_results):
        assert ts == py, f"route parity mismatch: ts={ts} py={py}"


def test_fixtures_cover_hard_invariant():
    """The fixture file must keep a scam-boundary case (docs/AGENTS invariants)."""
    with open(FIXTURES / "route_cases.json", encoding="utf-8") as f:
        cases = json.load(f)
    assert any(c["signals"]["scam_prob"] >= 0.5 and c["expected"]["lane"] == "scam" for c in cases)
    assert any(c["signals"]["scam_prob"] == 0.5 for c in cases)
    assert any(c["signals"].get("llm_status") == "unavailable" for c in cases)

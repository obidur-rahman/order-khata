"""Health, config, stats, eval and simulator endpoints (docs/05)."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .. import config, db
from ..schemas import EvalResponse, HealthResponse, StatsResponse

router = APIRouter()


class SimulatorRequest(BaseModel):
    running: bool
    interval_s: float = 8.0


class SimulatorResponse(BaseModel):
    running: bool
    interval_s: float


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> Any:
    pipeline = getattr(request.app.state, "pipeline", None)
    ready = bool(pipeline and pipeline.ready)
    # `model_loaded` reports the artifacts, not the uptime: the app is usable with
    # no model at all (everything goes to review), and saying so is the point.
    loaded = bool(pipeline and pipeline.model_loaded)
    return {
        "status": "ok" if ready else "warming_up",
        "model_loaded": loaded,
        "llm_provider": pipeline.llm.provider if pipeline else None,
        "llm_status": pipeline.llm_status if pipeline else "unavailable",
        "version": config.VERSION,
    }


@router.get("/config")
def get_config() -> Any:
    return {
        "tau_default": config.TAU_DEFAULT,
        "tau_min": config.TAU_MIN,
        "tau_max": config.TAU_MAX,
        "tau_other_offset": config.TAU_OTHER_OFFSET,
        "scam_t": config.SCAM_T,
        "escalate_t": config.ESCALATE_T,
        "decisive_t": config.DECISIVE_T,
        "classes": list(config.CLASSES),
        "class_meta": config.CLASS_META,
    }


@router.get("/stats", response_model=StatsResponse)
def stats() -> Any:
    c = db.counts()
    histogram = [
        {"bin_start": i / 10, "bin_end": (i + 1) / 10, "count": n}
        for i, n in enumerate(c["hist"])
    ]
    auto = c["lanes"].get("auto", 0)
    return {
        "total": c["total"],
        "lanes": c["lanes"],
        "classes": c["classes"],
        "histogram": histogram,
        "auto_count": auto,
        "seconds_per_message": config.SEED_SECONDS_PER_MSG,
        "time_saved_s": auto * config.SEED_SECONDS_PER_MSG,
    }


@router.get("/eval", response_model=EvalResponse)
def evaluation() -> Any:
    path = config.artifacts_dir() / "eval.json"
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        raise HTTPException(status_code=404, detail="eval_not_available")


@router.post("/simulator", response_model=SimulatorResponse)
async def simulator(body: SimulatorRequest, request: Request) -> Any:
    # `async def` is not decoration: `Simulator.start()` calls
    # `asyncio.create_task`, which needs a running loop. A sync endpoint is run in
    # a worker thread, where there is none, so starting the simulator used to fail
    # with "no running event loop" — and only when a seed pool existed, because an
    # empty pool returns early before touching asyncio.
    sim = getattr(request.app.state, "simulator", None)
    if sim is None:
        return {"running": False, "interval_s": body.interval_s}
    if body.running:
        started = sim.start(body.interval_s)
        if not started:
            return {"running": False, "interval_s": sim.interval_s}
    else:
        sim.stop()
    return {"running": sim.running, "interval_s": sim.interval_s}

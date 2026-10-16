"""FastAPI app: routers, lifespan (load pipeline + seed DB), static mount (docs/02).

Run locally:  uvicorn app.main:app --reload  (from backend/)
Production:   uvicorn app.main:app --host 0.0.0.0 --port 7860
"""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config, db
from .api import inbox, messages, misc
from .pipeline import Pipeline, load_seed_prediction_cache, save_seed_prediction_cache
from .simulator import Simulator

log = logging.getLogger("order_khata")


def _seed_predictions(pipeline: Pipeline, pending: list[dict]) -> None:
    """Classify seed messages once and cache results so cold start never
    calls the LLM 60+ times (docs/05 boot sequence)."""
    if not pending:
        return
    cache = load_seed_prediction_cache()
    missing = [p for p in pending if p["message_id"] not in cache]
    for p in missing:
        try:
            cache[p["message_id"]] = pipeline.classify(p["text"], source="seed")
        except Exception:
            log.exception("seed classify failed for %s", p["message_id"])
    for p in pending:
        pred = cache.get(p["message_id"])
        if pred:
            db.insert_prediction(p["message_id"], pred)
    if missing:
        save_seed_prediction_cache(cache)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    pipeline = Pipeline.create()
    app.state.pipeline = pipeline
    sim = Simulator(pipeline)
    app.state.simulator = sim

    pending = db.seed_if_empty()
    _seed_predictions(pipeline, pending)

    # Simulator pool = seed texts (docs/03 §5); no seed file -> pool empty.
    seed_path = config.data_dir() / "seed_inbox.json"
    if seed_path.exists():
        try:
            with open(seed_path, encoding="utf-8") as f:
                seed = json.load(f)
            sim.set_pool([
                {"text": m["text"], "script": m.get("script", "en")}
                for c in seed.get("conversations", [])
                for m in c.get("messages", [])
            ])
        except (OSError, json.JSONDecodeError):
            log.exception("seed_inbox.json unreadable; simulator idle")
    log.info("startup complete: engine=%s llm=%s", pipeline.engine_name, pipeline.llm_status)
    yield
    sim.stop()


app = FastAPI(title="Order Khata", version=config.VERSION, lifespan=lifespan)

# Dev only: `npm run dev` runs on :3000 and calls the API cross-origin.
# Production serves the static build same-origin from this process, and the
# middleware is a no-op there (docs/05 NFR: CORS limited to the app itself).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(messages.router, prefix="/api", tags=["messages"])
app.include_router(inbox.router, prefix="/api", tags=["inbox"])
app.include_router(misc.router, prefix="/api", tags=["misc"])

# Serve the static frontend when it has been built (docs/02 §1): out/ at repo
# root or frontend/out. Absent during backend-only development.
for _candidate in (Path(__file__).resolve().parents[2] / "out",
                   Path(__file__).resolve().parents[2] / "frontend" / "out"):
    if _candidate.is_dir():
        app.mount("/", StaticFiles(directory=_candidate, html=True), name="static")
        break

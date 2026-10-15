"""Background simulator (docs/02 §1, docs/05): replays held-out seed messages
into the inbox every `interval_s` seconds so the demo feed looks alive.
Gracefully inert when no seed pool exists.
"""
from __future__ import annotations

import asyncio
import logging
import random
from typing import Any, Optional

from . import db

log = logging.getLogger("dokanbox.simulator")


class Simulator:
    def __init__(self, pipeline) -> None:
        self.pipeline = pipeline
        self.pool: list[dict[str, Any]] = []
        self.running = False
        self.interval_s = 8.0
        self._task: Optional[asyncio.Task] = None

    def set_pool(self, entries: list[dict[str, Any]]) -> None:
        """entries: [{"text", "script"}] from the seed inbox (docs/03 §5)."""
        self.pool = [e for e in entries if e.get("text")]

    def start(self, interval_s: float = 8.0) -> bool:
        if not self.pool:
            return False  # nothing to replay (docs/08 cut list keeps this optional)
        self.interval_s = max(2.0, min(60.0, float(interval_s)))
        if self.running:
            return True
        self.running = True
        self._task = asyncio.create_task(self._run())
        return True

    def stop(self) -> None:
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None

    async def _run(self) -> None:
        while self.running:
            await asyncio.sleep(self.interval_s)
            try:
                self.replay_one()
            except Exception:  # never let the demo loop die
                log.exception("simulator replay failed")

    def replay_one(self) -> str:
        """Classify one pool message and insert it (source=simulator)."""
        entry = random.choice(self.pool)
        conv = db.create_conversation(
            random.choice(["Tanjila", "Rakib", "Sadia", "Imran", "Farhana", "Arif"]),
        )
        mid = db.insert_message(conv, entry["text"], entry.get("script", "en"), "simulator")
        pred = self.pipeline.classify(entry["text"], source="simulator")
        db.insert_prediction(mid, pred)
        return mid

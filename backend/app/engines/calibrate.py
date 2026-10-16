"""Temperature scaling (docs/04 §3).

Fitted in notebook section 7 (`ml/notebooks/order_khata_lab.ipynb`); here we only
load the fitted scalar and apply it to probability vectors in log space. Without
an artifact, T = 1.0 (identity) so the app works before calibration exists.
"""
from __future__ import annotations

import json
import math
from typing import Mapping, Sequence

from ..config import artifacts_dir


def load_temperature() -> float:
    path = artifacts_dir() / "calibration.json"
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        t = float(data.get("temperature", 1.0))
        return t if t > 0 else 1.0
    except (OSError, ValueError, TypeError):
        return 1.0


def apply_temperature(probs: Sequence[float], temperature: float) -> list[float]:
    """Scale probabilities: softmax(log(p) / T). T=1 returns the input."""
    if temperature == 1.0:
        return list(probs)
    logs = [math.log(max(p, 1e-12)) / temperature for p in probs]
    m = max(logs)
    exps = [math.exp(v - m) for v in logs]
    z = sum(exps)
    return [e / z for e in exps]


def scaled_probs(probs: Mapping[str, float], temperature: float) -> dict[str, float]:
    keys = list(probs.keys())
    values = apply_temperature([probs[k] for k in keys], temperature)
    return dict(zip(keys, values))

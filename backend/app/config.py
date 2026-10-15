"""Constants, thresholds, class list and label maps (docs/04, docs/05, docs/06).

No secrets here: API keys are read from environment variables only.
"""
from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Classes (docs/04 §1, docs/06 §2)
# ---------------------------------------------------------------------------
CLASSES: tuple[str, ...] = (
    "order",
    "price_question",
    "delivery_problem",
    "complaint",
    "scam",
    "other",
)

# UI labels + chip colors (docs/06 §2). Brand yellow is never a class/status color.
CLASS_META: dict[str, dict[str, str]] = {
    "order": {"label": "Order", "color": "#2F6BFF"},
    "price_question": {"label": "Price", "color": "#7A4DFF"},
    "delivery_problem": {"label": "Delivery", "color": "#0FA3A3"},
    "complaint": {"label": "Complaint", "color": "#FF4D8D"},
    "scam": {"label": "Scam", "color": "#E5252A"},
    "other": {"label": "Other", "color": "#8A8A8A"},
}

# 15 D1 intents -> 6 Dokanbox classes (docs/03 §2). All 15 must be present.
INTENT_TO_CLASS: dict[str, str] = {
    "product_search": "order",
    "product_availability": "order",
    "order_cancel": "order",
    "price_inquiry": "price_question",
    "discount_offer": "price_question",
    "shipping_delivery": "delivery_problem",
    "order_status": "delivery_problem",
    "complaint": "complaint",
    "return_refund": "complaint",
    "payment_issue": "complaint",
    "greeting": "other",
    "goodbye": "other",
    "thanks": "other",
    "out_of_scope": "other",
    "agent_request": "other",  # always escalate=1 -> Needs review (docs/03 §2)
}

# The 5 non-scam classes the decision model aggregates into (docs/04 §1)
BASE_CLASSES: tuple[str, ...] = tuple(c for c in CLASSES if c != "scam")

# ---------------------------------------------------------------------------
# Routing thresholds (docs/04 §4)
# ---------------------------------------------------------------------------
TAU_DEFAULT = 0.85          # slider default
TAU_MIN = 0.50              # slider range
TAU_MAX = 0.99
TAU_OTHER_OFFSET = 0.20     # tau_other = max(TAU_OTHER_MIN, tau - offset)
TAU_OTHER_MIN = 0.60
SCAM_T = 0.50               # fixed, not tied to the slider (hard invariant)
ESCALATE_T = 0.50
DEGRADED_MARGIN = 0.05      # degraded: top_prob >= min(0.99, tau + 0.05)
DEGRADED_MAX = 0.99

# ---------------------------------------------------------------------------
# LLM second signal (docs/04 §3.1)
# ---------------------------------------------------------------------------
LLM_TIMEOUT_S = 3.0
LLM_MAX_TOKENS = 80
LLM_CACHE_SIZE = 2000
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

# ---------------------------------------------------------------------------
# API limits (docs/05)
# ---------------------------------------------------------------------------
MAX_TEXT_LEN = 1000
RATE_LIMIT_PER_MIN = 30     # per IP on POST /api/messages
SEED_SECONDS_PER_MSG = 20   # "time saved" assumption shown on the Dashboard
VERSION = "0.1.0"

# ---------------------------------------------------------------------------
# Paths (repo-relative; overridable for tests via env)
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent


def data_dir() -> Path:
    return BACKEND_DIR / "data"


def artifacts_dir() -> Path:
    return BACKEND_DIR / "artifacts"


def db_path() -> Path:
    env = os.environ.get("DOKANBOX_DB")
    if env:
        return Path(env)
    return data_dir() / "dokanbox.db"

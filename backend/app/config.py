"""Constants, thresholds, class list and label maps (docs/04, docs/05, docs/06).

No secrets here: API keys are read from environment variables only.
"""
from __future__ import annotations

import os
from pathlib import Path


def _load_dotenv() -> None:
    """Minimal .env loader (repo root). Real environment always wins, so
    Space secrets / shell exports override the file. Values are never logged."""
    path = Path(__file__).resolve().parents[2] / ".env"
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError:
        return
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


def _env_flag(name: str, default: bool) -> bool:
    """A boolean env var in the spellings people actually write, or `default`.

    Anything unparseable keeps the default: a typo in an env var must not silently
    change what the deployment runs.
    """
    raw = os.environ.get(name, "").strip().lower()
    if raw in ("0", "false", "no", "off"):
        return False
    if raw in ("1", "true", "yes", "on"):
        return True
    return default


_load_dotenv()

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

# 15 D1 intents -> 6 Order Khata classes (docs/03 §2). All 15 must be present.
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
SCAM_T = 0.70               # fixed, not tied to the slider (hard invariant)
ESCALATE_T = 0.20           # read against the CALIBRATED escalate score
DECISIVE_T = 0.90           # at/above this the model's call is not vetoed (rule 4)
DEGRADED_MARGIN = 0.05      # degraded: top_prob >= min(0.99, tau + 0.05)
DEGRADED_MAX = 0.99

# SCAM_T: chosen on D1/D2 validation (notebook 6.3) as the first cut meeting the
# <= 2% false-alarm target of docs/07 §5. At 0.50 the head flagged 2.11% of
# ordinary shop chat; 0.70 flags 0.25% while recall holds at 0.97.
# ESCALATE_T: the escalate head is Platt-calibrated on validation (notebook 5.1)
# because class_weight="balanced" inflated its raw scores (mean 0.28 against a
# 0.12 base rate). 0.20 keeps the recall the raw 0.50 gave, with better precision.
# DECISIVE_T: the LLM may only veto a call the model is unsure about. Where it
# disagreed with a call at >= 0.90 the model was right 96% of the time and the LLM
# 23%, so vetoing those cost coverage and accuracy both (notebook 8.4).

# ---------------------------------------------------------------------------
# Engine A — S1, the intent/class signal (docs/04 §2.1)
# ---------------------------------------------------------------------------
# S1 ships two engines (docs/04 §2.1). The checkpoint is the better model — 0.9892
# macro-F1 against the baseline's 0.8870 on the same validation rows — but it is
# optional twice over: it needs ~1.3 GB of RAM, which a 512 MiB free instance does
# not have, and it drags in torch (~1 GB of packages, 644 MB of weights). So the
# **default is the backup**: boot loads no checkpoint, and `laya-ft` runs only when
# someone selects it — from Preferences, or with ENGINE_A at deploy time.
ENGINE_LAYA = "laya-ft"
ENGINE_TFIDF = "tfidf-lr"
ENGINE_CHOICES: tuple[str, ...] = (ENGINE_LAYA, ENGINE_TFIDF)
# ENGINE_A can only select a shipped engine: a typo in a Space secret would
# otherwise advertise an id no client can send back, and silently run the backup
# as if it were the requested engine.
_engine_a = os.environ.get("ENGINE_A", "").strip()
ENGINE_DEFAULT = _engine_a if _engine_a in ENGINE_CHOICES else ENGINE_TFIDF

# The checkpoint's own questions.yaml wording lives in engines/laya.py; only the
# repo id is configuration (it moved once already — docs/04 §2.1 licence note).
LAYA_REPO = os.environ.get("LAYA_REPO", "nafiullah/laya-multilingual-bn-ecom-voice")

# Operator kill switch for the checkpoint itself, independent of host memory:
# `LAYA_ENABLED=0` makes `laya-ft` permanently unavailable here — never offered,
# never attempted — which is the guarantee a deployment needs when it must not
# carry the 1.3 GB model *at all*, rather than trusting the RAM probe to notice a
# host whose cap it cannot read. It is checked before the probe and beats it.
# Absent or unparseable -> enabled: the probe is the real gate, and a typo must
# not quietly remove an engine from a deployment that can run it.
LAYA_ENABLED = _env_flag("LAYA_ENABLED", default=True)

# ---------------------------------------------------------------------------
# LLM second signal (docs/04 §3.1)
# ---------------------------------------------------------------------------
LLM_TIMEOUT_S = 3.0
LLM_MAX_TOKENS = 80
LLM_CACHE_SIZE = 2000

# Chosen at Hour 0 against Groq's current free-tier model list (docs/04 §3.1,
# docs/08 Phase 0) and kept here. Several candidates: a model that disappears
# (model_not_found, as happened to llama-3.1-8b-instant) falls through to the
# next one automatically. GROQ_MODELS env (comma-separated) overrides.
_GROQ_MODEL_DEFAULT = "qwen/qwen3.8-27b,openai/gpt-oss-20b"
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
    env = os.environ.get("ORDER_KHATA_DB")
    if env:
        return Path(env)
    return data_dir() / "order_khata.db"


def groq_api_keys() -> list[str]:
    """GROQ_API_KEYS (comma-separated, rotated on rate limit) or GROQ_API_KEY."""
    raw = os.environ.get("GROQ_API_KEYS") or os.environ.get("GROQ_API_KEY") or ""
    return [k.strip() for k in raw.split(",") if k.strip()]


def groq_models() -> list[str]:
    """Groq model candidates in preference order (comma-separated env override)."""
    raw = (
        os.environ.get("GROQ_MODELS")
        or os.environ.get("GROQ_MODEL")
        or _GROQ_MODEL_DEFAULT
    )
    return [m.strip() for m in raw.split(",") if m.strip()]


def hf_token() -> str | None:
    """HF token for model downloads (backend only; never reaches the frontend)."""
    return os.environ.get("HF_TOKEN") or None

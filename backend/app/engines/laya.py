"""Engine A — S1 — the optional Laya checkpoint (docs/04 §2.1).

`nafiullah/laya-multilingual-bn-ecom-voice`: a 322M mmBERT encoder fine-tuned into
*typed decisions* (no generated tokens). It answers the same three questions its own
`questions.yaml` defines; we use `intent` for S1 and ignore `order_confirm` (the router
has no use for it — docs/04 §1), and we deliberately do **not** take its `escalate`
answer: the router's rule 2 threshold (`ESCALATE_T = 0.20`) is fitted for the
Platt-calibrated TF-IDF head, and pointing it at an uncalibrated signal is exactly the
mistake docs/04 §2.1 records. S2 therefore stays on the TF-IDF head whichever engine S1
uses.

**Not the default, and nothing here loads until it is asked for.** The checkpoint needs
~1.3 GB of RAM; a 512 MiB free instance OOM-kills inside lifespan trying to hold it (see
`MIN_TOTAL_RAM`). So `ENGINE_DEFAULT` is the backup, `Pipeline` starts with an unloaded
engine, and the only thing that ever calls `load()` is an explicit selection — the
Preferences switch, `ENGINE_A=laya-ft`, or `POST /api/engine`.

Deliberately optional, in the strongest sense: torch and the `laya` package are **not**
in `requirements.txt`. If they are missing, if the host cannot hold the checkpoint, if
the operator turned it off (`LAYA_ENABLED=0`), if the weights cannot be fetched, if the
custom runtime fails — `load()` returns an engine that reports `loaded = False` and the
pipeline serves `tfidf-lr` and says so through `/api/health`. Boot never depends on this
file working.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

from .. import config
from ..config import LAYA_REPO
from .decision import aggregate_intents

log = logging.getLogger("order_khata.engines.laya")

GIB = 1024 ** 3
# 322M parameters in fp32 ≈ 1.29 GB of weights, plus the torch runtime, Python
# and headroom for activations and allocator fragmentation. Below this, loading
# the checkpoint does not fail — it takes the whole instance down: a Render free
# service (512 MiB) was OOM-killed inside lifespan, so no port ever opened and the
# process crash-looped instead of degrading. Refusing up front is the difference
# between "not available in this deployment" and a dead deploy.
MIN_TOTAL_RAM = 3 * GIB


def total_ram_bytes() -> Optional[int]:
    """The smallest RAM limit this process may actually use, or None.

    Probed before the import so an undersized instance never starts loading the
    model. `sysconf` reports the *board's* physical memory, which is the wrong
    number in a capped container: a 512 MiB cgroup can sit on a machine with
    many GiB. A host with no usable answer at all returns None, which is the old
    behaviour: try to load, degrade honestly on error.
    """
    candidates: list[int] = []
    try:
        pages = int(os.sysconf("SC_PHYS_PAGES"))
        page_size = int(os.sysconf("SC_PAGE_SIZE"))
        if pages > 0 and page_size > 0:
            candidates.append(pages * page_size)
    except (ValueError, OSError, AttributeError):
        pass
    board = _windows_total_ram()
    if board is not None:
        candidates.append(board)
    cap = cgroup_memory_limit()
    if cap is not None:
        candidates.append(cap)
    return min(candidates) if candidates else None


def _windows_total_ram() -> Optional[int]:
    """Physical memory as Windows reports it, or None on any other platform.

    `os.sysconf` is Unix-only, so without this the probe would answer None on
    Windows — and the 3 GiB guard would quietly not exist on the platform a
    developer is most likely to run the checkpoint on. Every failure is a None:
    probing must never be able to break loading.
    """
    try:
        import ctypes
    except ImportError:  # pragma: no cover — CPython ships ctypes everywhere
        return None
    if not hasattr(ctypes, "windll"):  # not Windows
        return None

    class MemoryStatusEx(ctypes.Structure):
        _fields_ = [("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]

    status = MemoryStatusEx()
    status.dwLength = ctypes.sizeof(status)
    try:
        ok = ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
    except (AttributeError, OSError):
        return None
    return int(status.ullTotalPhys) if ok else None


def refusal_reason() -> Optional[str]:
    """Why this process must not load the checkpoint, or None to go ahead.

    Two gates, cheapest and most authoritative first: the operator's kill switch
    (`LAYA_ENABLED=0`), which beats every other consideration, then the host's
    memory. Split out of `load()` and kept import-free on purpose: Preferences asks
    it on every page load to decide whether the checkpoint is even offered, and
    answering must never cost a torch import or a 644 MB download.
    """
    if not config.LAYA_ENABLED:
        return "the checkpoint is disabled on this deployment (LAYA_ENABLED=0)"
    ram = total_ram_bytes()
    if ram is not None and ram < MIN_TOTAL_RAM:
        return (f"instance has {ram / GIB:.1f} GiB RAM, the checkpoint needs "
                f">= {MIN_TOTAL_RAM / GIB:.0f} GiB — not attempted on this deployment")
    return None


# The container's cap, which is the number a containerised deployment lives by.
# Both files are read because hosts differ: v2 is the usual path on current
# systemd/Docker, v1 still appears on older clusters. Absent files are fine.
CGROUP_LIMIT_FILES = (
    "/sys/fs/cgroup/memory.max",                   # cgroup v2
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",  # cgroup v1
)


def parse_cgroup_limit(raw: str) -> Optional[int]:
    """A cgroup memory cap in bytes, or None for unlimited / absent / garbage.

    v2 writes `max` when uncapped; v1 writes ~2**63-1, page-rounded, when
    uncapped. Both must read as "no limit" — v1's number in particular is large
    enough to sail through any `>= 3 GiB` check if taken at face value.
    """
    text = (raw or "").strip()
    if not text or text == "max":
        return None
    try:
        value = int(text)
    except ValueError:
        return None
    if value <= 0 or value >= 2**62:
        return None
    return value


def cgroup_memory_limit() -> Optional[int]:
    """Smallest cap among the cgroup files that exist here, or None if uncapped."""
    limits = []
    for path in CGROUP_LIMIT_FILES:
        try:
            with open(path, encoding="ascii", errors="ignore") as handle:
                limit = parse_cgroup_limit(handle.read())
        except OSError:
            continue
        if limit is not None:
            limits.append(limit)
    return min(limits) if limits else None

# The checkpoint's questions.yaml, `instructions[0]` — the canonical wording used at
# training and evaluation. A paraphrased question is a way to "discover" that a good
# model is bad, so this is copied, not rewritten.
QUESTIONS: dict[str, Any] = {
    "intent": {
        "type": "choice",
        "instructions": "What is the customer's intent?",
        "criteria": {
            "greeting": "says hello or starts the conversation",
            "goodbye": "ends the conversation",
            "thanks": "thanks or praises the service",
            "product_search": "looks for a kind of product to buy",
            "product_availability": "asks whether an item is in stock or available",
            "price_inquiry": "asks the price or cost of an item",
            "order_status": "asks where their order is or what state it is in",
            "order_cancel": "wants to cancel an order",
            "return_refund": "wants to return an item or get money back",
            "shipping_delivery": "asks about delivery time, charge, area or pickup",
            "payment_issue": "has a problem paying or with a payment method",
            "discount_offer": "asks about discounts, coupons or offers",
            "complaint": "is unhappy about a product, order or service",
            "agent_request": "asks to talk to a human agent",
            "out_of_scope": "talks about something unrelated to shopping",
        },
    },
    "escalate": {
        "type": "noul",
        "instructions": "This call should be transferred to a human agent.",
        "criteria": {"false": "the automated agent can keep handling the customer",
                     "true": "a human agent should take over"},
    },
}


def flatten_answers(answers: dict[str, Any]) -> dict[str, float]:
    """The model's intent answer -> the 15 intent probabilities -> the 5 base classes.

    Kept pure and public so it can be tested without torch: this fold is the only
    place a Laya answer turns into a signal, and it is the same `aggregate_intents`
    the baseline uses (one mapping, not two that can drift).

    Two corrections the raw answer needs, both narrow on purpose:
    * non-numeric values are dropped rather than coerced;
    * the checkpoint returns its probabilities rounded to four decimals, so a full
      answer sums to ~0.9998. When *everything* it said maps to a known intent,
      that gap is rounding noise and the result is re-normalised — the 6-class
      vector is drawn as a distribution (docs/06 §5) and must sum to one. When part
      of the answer is unrecognised, nothing is rescaled: the remaining mass stays
      where it is and the hole stays visible, instead of a dropped label being
      turned into certainty the model never expressed.
    """
    intent = answers.get("intent") or {}
    raw = intent.get("probabilities") or {}
    probs = {str(k): float(v) for k, v in raw.items() if isinstance(v, (int, float))}
    if not probs:
        # A `choice` answer without probabilities still names a class. Use it, at
        # certainty, rather than pretending the model said nothing.
        choice = intent.get("choice")
        probs = {str(choice): 1.0} if choice else {}

    base5 = aggregate_intents(probs)
    total = sum(base5.values())
    if total > 0 and total >= sum(probs.values()) - 1e-3:
        base5 = {cls: p / total for cls, p in base5.items()}
    return base5


class LayaEngine:
    """S1 backed by the checkpoint. `loaded = False` is a supported state."""

    def __init__(self, agent: Any = None, repo: str = LAYA_REPO,
                 error: Optional[str] = None) -> None:
        self._agent = agent
        self.repo = repo
        self.error = error

    @property
    def name(self) -> str:
        return "laya-ft"

    @property
    def loaded(self) -> bool:
        return self._agent is not None

    @classmethod
    def load(cls, repo: str = LAYA_REPO) -> "LayaEngine":
        """Load the checkpoint, or return an engine that honestly knows nothing.

        Any failure lands here: no torch, no package, no weights, no network on a
        cold ephemeral disk, a custom runtime that changed under us, an instance
        too small to hold 322M parameters, an operator who turned it off. This is
        the normal path on a machine that only installed `requirements.txt`.

        Called on demand, never at boot (docs/04 §2.2): an instance that cannot
        hold the checkpoint should not find out by being killed for trying.
        """
        refusal = refusal_reason()
        if refusal:
            return cls(error=refusal)
        try:
            import laya  # noqa: PLC0415 — optional dependency, imported on purpose late

            agent = laya.load(repo)
            log.info("laya engine loaded: %s", repo)
            return cls(agent=agent, repo=repo)
        except Exception as exc:  # noqa: BLE001 — fallback is a supported state
            log.warning("laya engine unavailable (%s: %s); falling back to %s",
                        type(exc).__name__, exc, "tfidf-lr")
            return cls(error=f"{type(exc).__name__}: {exc}")

    def predict_base5(self, text: str) -> dict[str, float]:
        """5-class probabilities for one message. Raises if not loaded."""
        if self._agent is None:
            raise RuntimeError("laya engine is not loaded")
        answers = self._agent.predict(text, QUESTIONS)["answers"]
        return flatten_answers(answers)

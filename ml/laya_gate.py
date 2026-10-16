"""The Hour-0 gate, as a script you can re-run: Laya vs the shipped baseline.

The gate in `ml/notebooks/order_khata_lab.ipynb` §4.2 is written as a notebook cell and
runs only if the `laya` package is installed — which, at the time the pipeline was built,
it was not, so §4.3 recorded `adopted = False` with the reason "not importable". This
script is the same measurement, run for real on 2026-10-17 and recorded in docs/04 §2.1.

    py -3.12 -m pip install laya                 # brings torch; 405 KB wheel
    CUDA_VISIBLE_DEVICES=""  py -3.12 ml/laya_gate.py

Two halves, in this order, because the second is only meaningful if the first holds:

  A. reproduce baseline B1 (notebook §3.1) — and CHECK that the numbers match the SHIPPED
     artifact. If VAL and TEST do not come out at 0.8675 and 0.8160, the harness is not
     faithful and the script exits non-zero rather than printing a candidate number.
  B. load the checkpoint on CPU and measure the same N=100 validation rows.

The adopt rule is copied verbatim from notebook §4.3 and was fixed BEFORE any result was
seen: macro-F1 >= baseline + 0.03  AND  CPU latency < 1500 ms.

Reads only local files (`backend/data/d1_*.jsonl`) and the Hub (checkpoint, ~644 MB, once).
Writes nothing.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

# stdout is cp1252 on Windows and the report uses box-drawing characters
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import accuracy_score, f1_score  # noqa: E402
from sklearn.pipeline import Pipeline as SkPipeline  # noqa: E402

SEED = 42
N = 100
LATENCY_BUDGET_MS = 1500

# Baseline macro-F1 the harness must reproduce before anything about the candidate is
# allowed to print: full validation as retrained here, and the test split as shipped in
# eval.json (`systems.B1`). Measured 2026-10-17 from `decision_tfidf.joblib`.
EXPECT_VAL_F1 = 0.8675
EXPECT_TEST_F1 = 0.8160
TOLERANCE = 0.0005
REPO = "nafiullah/laya-multilingual-bn-ecom-voice"
ROOT = Path(__file__).resolve().parents[1]      # repo root; this file lives in ml/
DATA = ROOT / "backend" / "data"

# docs/03 §2, mirrored from backend/app/config.py
INTENT_TO_CLASS = {
    "product_search": "order", "product_availability": "order", "order_cancel": "order",
    "price_inquiry": "price_question", "discount_offer": "price_question",
    "shipping_delivery": "delivery_problem", "order_status": "delivery_problem",
    "complaint": "complaint", "return_refund": "complaint", "payment_issue": "complaint",
    "greeting": "other", "goodbye": "other", "thanks": "other",
    "out_of_scope": "other", "agent_request": "other",
}
BASE_CLASSES = ("order", "price_question", "delivery_problem", "complaint", "other")

# The checkpoint's own questions.yaml, instructions[0] — the canonical wording it was
# trained on. Feeding it a question sentence it has never seen is a way to "discover"
# that a good model is bad.
QUESTIONS = {
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


def aggregate_intents(probs: dict[str, float]) -> dict[str, float]:
    """15 D1 intents -> 5 base classes (docs/04 §1). Same fold the baseline uses."""
    out = {c: 0.0 for c in BASE_CLASSES}
    for intent, p in probs.items():
        cls = INTENT_TO_CLASS.get(intent)
        if cls:
            out[cls] += float(p)
    return out


def top_class(probs: dict[str, float]) -> str:
    agg = aggregate_intents(probs)
    return max(agg, key=lambda c: agg[c])


def load_jsonl(name: str) -> list[dict]:
    with open(DATA / name, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_dotenv() -> None:
    """Hub token for the download — never printed, never logged."""
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def baseline_check(y_val: list[str]) -> float:
    """A. baseline B1 exactly as notebook §3.1, plus the numbers the rule compares
    against. Returns the full-validation macro-F1."""
    train_rows, val_rows = load_jsonl("d1_train.jsonl"), load_jsonl("d1_val.jsonl")
    X_tr = [r["text"] for r in train_rows]
    y_intent = [r["intent"] for r in train_rows]

    t0 = time.perf_counter()
    b1 = SkPipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2,
                                  sublinear_tf=True)),
        ("lr", LogisticRegression(max_iter=2000, class_weight="balanced", C=4.0,
                                  random_state=SEED)),
    ])
    b1.fit(X_tr, y_intent)
    fit_s = time.perf_counter() - t0
    classes = b1.named_steps["lr"].classes_

    X_va = [r["text"] for r in val_rows]
    top = [top_class(dict(zip(classes, row))) for row in b1.predict_proba(X_va)]
    full = f1_score(y_val, top, average="macro", zero_division=0)
    print(f"── baseline B1 (tfidf-lr), fit {fit_s:.1f}s ──")
    print(f"  macro-F1, full val ({len(y_val)} rows): {full:.4f}   [expect {EXPECT_VAL_F1}]")
    print(f"  macro-F1, val[:{N}]                  : "
          f"{f1_score(y_val[:N], top[:N], average='macro', zero_division=0):.4f}")
    print(f"  accuracy, val[:{N}]                  : "
          f"{accuracy_score(y_val[:N], top[:N]):.4f}")

    # The test split is what eval.json's B1 (and the Evaluation page) reports — check it
    # too, so a drift in either split cannot pass unnoticed.
    test_rows = load_jsonl("d1_test.jsonl")
    y_test = [r["cls"] for r in test_rows]
    test_top = [top_class(dict(zip(classes, row)))
                for row in b1.predict_proba([r["text"] for r in test_rows])]
    test_f1 = f1_score(y_test, test_top, average="macro", zero_division=0)
    print(f"  macro-F1, test ({len(y_test)} rows)      : {test_f1:.4f}   "
          f"[eval.json B1 = {EXPECT_TEST_F1}]")

    drift = [f"{name} {got:.4f} != {want:.4f}" for name, got, want in
             (("val", full, EXPECT_VAL_F1), ("test", test_f1, EXPECT_TEST_F1))
             if abs(got - want) > TOLERANCE]
    if drift:
        print("\nHARNESS CHECK FAILED (" + "; ".join(drift) + ")")
        print("This harness does not reproduce the shipped baseline, so a candidate number "
              "from it is not comparable. Fix the harness before quoting anything.")
        raise SystemExit(2)
    print("  harness check: both splits reproduce the shipped artifact "
          "-> the comparison below is valid")
    return full


def main() -> None:
    load_dotenv()
    val_rows = load_jsonl("d1_val.jsonl")
    X_val = [r["text"] for r in val_rows]
    y_val = [r["cls"] for r in val_rows]
    print(f"val {len(X_val)} rows", flush=True)

    baseline_f1 = baseline_check(y_val)

    import numpy as np  # noqa: E402

    import laya  # noqa: E402

    print(f"\n── candidate: {REPO} ──", flush=True)
    t0 = time.perf_counter()
    agent = laya.load(REPO)               # first call downloads ~644 MB, once
    print(f"  loaded in {time.perf_counter() - t0:.0f}s (download + load)", flush=True)

    t0 = time.perf_counter()
    first = agent.predict(X_val[0], QUESTIONS)["answers"]
    print(f"  warm-up: {(time.perf_counter() - t0) * 1000:.0f} ms | "
          f"keys: {list(first)}", flush=True)

    t0 = time.perf_counter()
    answers = [agent.predict(t, QUESTIONS)["answers"] for t in X_val[:N]]
    lat = (time.perf_counter() - t0) / N * 1000
    print(f"  latency: {lat:.1f} ms/message (CPU, {N} messages)", flush=True)

    laya_top = [top_class(a["intent"]["probabilities"]) for a in answers]
    f1_sub = f1_score(y_val[:N], laya_top, average="macro", zero_division=0)
    esc = [a["escalate"]["noul"] for a in answers]
    print(f"\n  Laya on the same {N} validation rows")
    print(f"    accuracy (5 base classes): {accuracy_score(y_val[:N], laya_top):.4f}")
    print(f"    macro-F1          : {f1_sub:.4f}")
    print(f"    escalate P(true)  : mean {float(np.mean(esc)):.3f}")

    ok_f1 = f1_sub >= baseline_f1 + 0.03
    ok_lat = lat < LATENCY_BUDGET_MS
    print("\n══ VERDICT (rule fixed in notebook §4.3 before the run) ══")
    print(f"  macro-F1 {f1_sub:.3f} vs baseline {baseline_f1:.3f} "
          f"(needs >= {baseline_f1 + 0.03:.3f}): {'PASS' if ok_f1 else 'FAIL'}")
    print(f"  latency {lat:.0f} ms vs budget {LATENCY_BUDGET_MS} ms: "
          f"{'PASS' if ok_lat else 'FAIL'}")
    print(f"  ADOPT LAYA AS ENGINE A: {bool(ok_f1 and ok_lat)}")
    print("\nNote: a PASS here is a measurement, not a decision. Shipping it also means "
          "torch + 644 MB\nof weights in the container and re-running notebook §8 — see "
          "docs/04 §2.1.")


if __name__ == "__main__":
    main()

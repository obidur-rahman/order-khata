# 07 — Evaluation Plan

Goal: one honest, defensible set of numbers, produced by section 8 of `ml/notebooks/order_khata_lab.ipynb` and stored in `backend/artifacts/eval.json`.

## 1. Questions the evaluation answers
1. How accurate is the 6-class classifier overall and per script (bn / bl / en / mx)?
2. Is the confidence score trustworthy (calibration)?
3. What fraction of messages can be handled automatically at what accuracy (coverage vs accuracy)?
4. Does the dual-signal rule help versus a single engine?
5. How well does it generalize to a different source (OOD)?
6. How good is scam detection, including false alarms on normal shop chat?

## 2. Datasets and discipline
- In-distribution: D1 test (806). Out-of-distribution: D3 BanglaTOD e-commerce subset (map its 10 e-commerce intents to the 6 classes; timebox to 1 h; if mapping is unreliable, report OOD qualitatively).
- Scam: D2 held-out test + D1 test negatives.
- τ and calibration chosen on validation only. Test split evaluated once at the end. No prompt tuning on test.
- Seed inbox messages come from test; they are for the demo, not for reported numbers beyond the offline run.

## 3. Systems compared (rows in the table)
| ID | System |
|---|---|
| B1 | TF-IDF char n-gram + logistic regression |
| B2 | Zero-shot Groq LLM only |
| E1 | Decision model only (calibrated) |
| E2 | Decision model + LLM agreement rule |
| E3 | Full Order Khata policy (E2 + escalate + scam rule) |

**Every row above was measured with Engine A = `tfidf-lr`** — which is also the engine a deployment serves by default, so these tables describe the running engine unless someone has selected the checkpoint (docs/04 §2.1–2.2). The page still names the serving engine next to them, because any visitor can switch it. The checkpoint's own comparison lives in docs/04 §2.1 and `ml/laya_gate.py`; it is deliberately not folded into this table, whose rows come from one artifact.
| (optional) E4 | Hosted decision model (Mercury Decide / Span-01 Lite) |
| (optional) F1 | LoRA fine-tuned small model (only if time remains) |

## 4. Metrics
- Accuracy, macro-F1, per-class precision/recall/F1; breakdown by script.
- Calibration: ECE (15 bins), reliability data, Brier score; before vs after temperature scaling.
- Selective prediction: sweep τ from 0.50 to 0.99 (step 0.01). For each τ: coverage = share routed Auto; **auto accuracy** = accuracy on the Auto slice; review-queue size. Output the full curve plus values at τ ∈ {0.70, 0.80, 0.85, 0.90, 0.95}.
- Scam: precision, recall, F1 on D2 test; **false-alarm rate on D1 test shop messages**; recall at fixed false-alarm rate 1%.
- Latency: p50/p95 of full classify on the Space (measured after deployment).
- Ambiguity analysis: share of low-confidence items that carry a D1 `alt_intent`.

## 5. Targets (report actuals, do not tune to hit them)
- **Auto-lane accuracy ≥ 90% at default τ.** Measured **94.2%** (τ = 0.85, `eval.json` → `systems.E3`).
- **Auto-lane coverage ≥ 50% at default τ**, reported rather than targeted. Measured **53.6%**; at τ = 0.70 the same policy covers 56.7%.
  Coverage is structurally bounded, and the notebook (§8.4) measures it: messages the model does not call confidently (~26%) and messages that ask for a person (~13%) can never be auto-handled. A *perfect* escalate oracle still leaves coverage at 56.2%. **This target previously read "coverage ≥ 60%"; that number was written before anything was measured, is unreachable without letting the bot answer customers who asked for a human, and was corrected to the measured operating point instead of bending the system toward it.**
- **Scam false-alarm rate ≤ 2% on D1 shop messages.** Measured **0.25%** on test, chosen at 1.76% on validation (`SCAM_T` = 0.70).
- **Scam recall ≥ 95% on D2 held-out.** Measured **96.9%**.
- **ECE ≤ 0.05** after calibration.
- **Measured, not promised:** every number above lives in `backend/artifacts/eval.json` and nowhere else. If a run disagrees with this list, the list is what is wrong.
- **Engine attribution.** Where the serving engine differs from the engine a number was measured on, both are shown and neither is adjusted. Today that means: E1/E2/E3 and B1 describe `tfidf-lr`, which is the engine a deployment serves by default; `laya-ft` is opt-in, and its measurement is in docs/04 §2.1 rather than in these rows. The `eval.json` limitations list carries the same statement from the run that produced it.

## 6. Output schema (`eval.json`, abridged)
```json
{
  "generated_at": "...",
  "data": {"d1_test_n": 806, "d2_test_n": 0, "d3_n": 0},
  "systems": {"B1": {"accuracy": 0, "macro_f1": 0}, "E3": {"accuracy": 0, "macro_f1": 0}},
  "per_class": {"order": {"p": 0, "r": 0, "f1": 0}},
  "per_script": {"bn": {"accuracy": 0}, "bl": {}, "en": {}, "mx": {}},
  "calibration": {"ece_before": 0, "ece_after": 0, "reliability": []},
  "coverage_curve": [{"tau": 0.5, "coverage": 0, "auto_accuracy": 0}],
  "scam": {"precision": 0, "recall": 0, "false_alarm_d1": 0},
  "ood": {"dataset": "BanglaTOD", "accuracy": 0, "n": 0},
  "latency_ms": {"p50": 0, "p95": 0},
  "limitations": ["..."]
}
```

## 7. Limitations to print on the Evaluation page (verbatim intent)
1. The intent corpus is largely machine-generated; real customer typos, dialects and disfluencies are under-represented.
2. Gold intent labels are trusted from the source; the escalate flag and alt_intent are machine-assisted annotations, and escalate reflects a policy, not ground truth.
3. Scam training/test data is SMS-style, not shop-chat DMs.
4. The in-distribution test set shares a source with the training data; the OOD result is the more conservative number.
5. The inbox is simulated; no live Facebook integration.
6. Class "Delivery" includes pre-purchase delivery questions.
7. Engine A in the recorded run was `tfidf-lr`, which is also the deployment default; the opt-in Laya checkpoint's own comparison is reported in docs/04 §2.1 and is not one of the numbers above. The Evaluation page names the engine it is serving next to that statement.

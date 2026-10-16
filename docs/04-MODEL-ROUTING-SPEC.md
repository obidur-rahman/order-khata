# 04 — Model & Routing Specification

## 1. Signals
For each message the system produces these signals:

| Signal | Source | Output |
|---|---|---|
| S1 intent probs | Decision model: D1-trained TF-IDF char n-grams + logistic regression, shipped as `tfidf-lr`. The Laya candidate **passed** the Hour-0 gate and is deliberately not adopted — measured numbers and reasons in §2.1 | 15 intent probabilities → aggregated to 5 classes (`order, price_question, delivery_problem, complaint, other`) |
| S2 escalate prob | Escalate head over the same features, Platt-calibrated on D1 validation (notebook §5.1; artifact `escalate_tfidf.joblib`) | `escalate_prob` ∈ [0,1] |
| S3 scam prob | Scam head (TF-IDF char n-grams + logistic regression trained on D2; optionally ensemble with decision-model `noul` scam question) | `scam_prob` ∈ [0,1] |
| S4 LLM opinion | Groq (fallback Gemini) | `llm_class`, `llm_reason` (one short English sentence), `llm_status` ∈ {ok, unavailable} |

Final 6-class vector = the 5 aggregated classes scaled by `(1 − scam_prob)` plus `scam` = `scam_prob`. Top class and `top_prob` come from this vector.

## 2. Engine selection (Hour-0 bake-off)
Candidates for S1, evaluated on D1 validation (not test) for accuracy, macro-F1, ECE and latency on CPU:
1. Laya fine-tuned checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`, 322M mmBERT encoder) — the plan's default. **Measured 2026-10-17, passed the gate, not adopted (§2.1).**
2. Mercury Decide via OpenRouter free route (hosted; check rate limits, Bangla quality). Not pursued — no hosted comparison row was needed once the self-hosted candidate passed.
3. Span-01 Lite free tier (hosted; same checks). Not pursued, same reason.
4. Baseline: TF-IDF char n-gram + logistic regression (CPU, trains in seconds). **Shipped as Engine A.**
5. Zero-shot Groq (the LLM alone) for reference. Measured as B2 on the Evaluation page.

**Decision rule:** pick the engine with the best macro-F1 among those that (a) run within the free budget, (b) hit latency target, (c) have a rate limit that survives judging. Prefer a self-hosted model over a hosted free route because it has no rate limit. Hosted routes may serve as an additional comparison row only.

### 2.1 Gate result — run 2026-10-17 (this closes the Hour-0 item)
The gate had not actually been run when this document was first written; notebook §4.3 recorded `adopted = False` with the reason *"laya is not importable in this kernel"*. It has now been run — `ml/laya_gate.py`, which is §4.2's harness as a re-runnable script — over the first 100 rows of D1 validation, with the checkpoint's canonical `questions.yaml` wording and the intent probabilities folded through `INTENT_TO_CLASS`, under the decision rule above, which was fixed **before** the run (macro-F1 ≥ baseline + 0.03 **and** CPU latency < 1500 ms).

```
py -3.12 -m pip install laya
CUDA_VISIBLE_DEVICES="" py -3.12 ml/laya_gate.py     # ~644 MB checkpoint, once
```

The script refuses to be quoted if it knows the baseline half of the harness is wrong: it re-derives B1 from `d1_train.jsonl` and checks the full-validation and test macro-F1 against the numbers below before anything about the candidate is printed.

| On the same 100 D1-validation rows | macro-F1 | accuracy | CPU latency, per message |
|---|---|---|---|
| `tfidf-lr` — shipped, read from `decision_tfidf.joblib` | 0.8870 | 0.8900 | ~12 ms (decision + escalate + scam heads) |
| Laya `nafiullah/laya-multilingual-bn-ecom-voice` (322M) | **0.9892** | 0.9900 | **45.6 ms** (its intent + escalate answers; repeat run 45.0 ms) |

macro-F1 is on the 5 base classes the router aggregates to; Laya's probabilities are put through the same `INTENT_TO_CLASS` fold, so the two rows are the same measurement.

The rule compares against the baseline on the **full validation split** (794 rows), macro-F1 0.8675 — reproduced exactly from the shipped artifact. (The `eval.json` B1 = 0.8160 the Evaluation page shows is the *test* split, 806 rows, also reproduced exactly.)

**Gate: PASS** — 0.989 ≥ 0.8675 + 0.03, and ~45 ms < 1500 ms. On identical rows the candidate beats the baseline by 10.2 points. Both halves were run twice (`ml/laya_gate.py`); scores reproduced exactly, latency varied by under a millisecond.

**Decision: Engine A in this build stays `tfidf-lr`.** The numbers are real; the switch is not a one-line change, and shipping it half-done would break rules this project puts above a score:

- **Cost inside the free Space.** It adds the `laya` package + torch CPU to the image (~1 GB installed) and 643.8 MB of weights plus a 34.4 MB tokenizer that an ephemeral Space re-downloads on every restart (docs/02 §6). Serving RAM goes from the measured ~205 MB to roughly 1.3 GB for a 322M fp32 encoder. Loading it here took 25 s on the first run, which included the download, and 10 s once the weights sat in the local cache — on a Space the first figure is the one that repeats, because the disk does not survive a restart.
- **Every published number would be invalidated.** `eval.json` — and therefore the whole Evaluation page — describes `tfidf-lr` (E1/E2/E3, coverage curve, calibration, scam head). Changing Engine A means re-running notebook §8 end to end, not editing a constant.
- **The escalate head would need re-deriving.** Laya's own `escalate` question returns a mean P(true) of 0.250 on that sample, against the policy base rate the current Platt-calibrated head and `ESCALATE_T = 0.20` were chosen for. Routing rule 2 must not be pointed at an uncalibrated signal.
- **The number is in-distribution.** The checkpoint was fine-tuned on exactly the corpus we evaluate on — its card lists `nafiullah/bangla-ecom-voice-decisions` and `Badhon/BanglaEComIntent` — so 0.989 means "it learned this corpus", not "it generalises". It has no OOD measurement at all; the conservative number we do have is ours (36.2% 6-class on n=105, docs/07). Putting 0.989 on a product screen would be precisely the overselling this project forbids.

Laya's numbers therefore live **here and in notebook §4.3 only**. They must never appear on the Evaluation page.

**Licensing correction.** The fine-tuned checkpoint is **CC BY-NC-SA 4.0**, not Apache-2.0: Apache-2.0/MIT cover the *base* Laya model, the Laya code and mmBERT inside it (docs/02 §7 previously assumed the fine-tune inherited those). Non-commercial, like D1 — any future adoption carries the same credit and the same NC terms.

## 3. Calibration
- Fit **temperature scaling** (single scalar T) on D1 validation / `calibration` split for S1 logits (minimize NLL). If the model only returns probabilities, apply scaling in log-prob space.
- Report ECE (15 bins) before and after, and a reliability diagram data series.
- Scam head: Platt scaling on D2 validation.
- Escalate head: Platt scaling on D1 validation, because `class_weight="balanced"` inflates its raw scores (mean 0.28 against a 0.13 base rate) and `ESCALATE_T` must mean what it says.
- Store parameters in `backend/artifacts/calibration.json`.
- Honest note: the dataset's soft targets (0.90 gold) shape the model's raw confidence, so calibration must be re-fit against hard labels.

## 4. Routing policy (approved)
Inputs: `top_class`, `top_prob`, `scam_prob`, `escalate_prob`, `llm_class`, `llm_status`, threshold τ (default 0.85, slider range 0.50–0.99), `τ_other` = max(0.60, τ − 0.20).

Evaluate in this order, first match wins:

1. **Scam lane:** `scam_prob ≥ SCAM_T` → lane `scam`. Never auto-handled, regardless of anything else. `SCAM_T` is fixed at **0.70**, not tied to the slider: it was chosen on D1/D2 validation as the first cut meeting the ≤ 2% false-alarm target of `docs/07` §5. At 0.50 the head flagged 2.11% of ordinary shop chat; 0.70 flags 0.25% while scam recall holds at 0.97 (notebook 6.3).
2. **Review (escalate):** `escalate_prob ≥ ESCALATE_T` → lane `review`, reason "Customer may need a human". `ESCALATE_T` is **0.20**, read against a *calibrated* score: the head is trained with `class_weight="balanced"`, which inflated its raw output (mean 0.28 against a 0.13 base rate), so a Platt calibrator is fitted on D1 validation before the threshold is applied (notebook 5.1). 0.20 keeps the recall the old raw 0.50 gave, with better precision.
3. **Review (low confidence):** if `top_class == other`, require `top_prob ≥ τ_other`, else require `top_prob ≥ τ`; if not met → lane `review`, reason "Low confidence (p = …)".
4. **Review (disagreement):** if `llm_status == ok` and `llm_class ≠ top_class` **and `top_prob < DECISIVE_T` (0.90)** → lane `review`, reason "Second opinion disagrees (LLM: …)". The LLM is a **tie-breaker, not an oracle**: it may only veto a call the decision model is itself unsure about. Measured on D1 test (notebook 8.4), when the LLM disagreed with a call the model made at ≥ 0.90 the model was right 96% of the time and the LLM 23%, so an unconditional veto cost both coverage (0.54 → 0.35) and accuracy.
5. **Auto:** otherwise → lane `auto`.

Degraded mode: if `llm_status == unavailable`, skip rule 4, and apply a **stricter** confidence requirement `top_prob ≥ min(0.99, τ + 0.05)` for non-`other` classes. The UI shows the banner "Second opinion unavailable · stricter threshold in effect".

When the decision artifacts are absent the engine reports `model_loaded: false` and returns a flat distribution, so no message can clear rule 3 and everything lands in `review`. There is no keyword fallback: it looked like a second opinion without being one.

Every routed message stores `lane` and `route_reason` so the UI can show *why*.

## 3.1 Second-signal prompt contract (S4)
- System prompt: classify a customer message sent to an online shop in Bangladesh into exactly one of `order, price_question, delivery_problem, complaint, scam, other`; the message may be Bangla, Banglish or English.
- Output: JSON only: `{"class": "<one of six>", "reason": "<max 15 words, English>"}`.
- Temperature 0; max tokens 80; timeout 3 s; one retry; JSON parse guarded (strip code fences, validate class against the enum, otherwise `unavailable`).
- The LLM is **not** shown the decision model's answer (independence).
- Cache by SHA-256 of normalized text, in memory (LRU 2,000 entries).
- Provider order: Groq → Gemini free → none. Switch on HTTP 429/5xx/timeout. Model names are chosen at Hour 0 against the current free-tier list and kept in `config.py`.
- Key and model rotation: `GROQ_API_KEYS` may hold several comma-separated keys and `GROQ_MODELS` several candidate models (env-overridable). The chain is model-major/key-minor: a 429/5xx rotates to the next key for the current model, a `model_not_found` advances to the next model, so a removed model (which happened to `llama-3.1-8b-instant`) or a rate-limited key degrades one entry at a time instead of killing the second signal.

## 5. Evaluation hooks
The router is a pure function `route(signals, τ) -> (lane, reason)` implemented **twice with identical logic**: Python (`router.py`, used in offline evaluation) and TypeScript (`frontend/lib/route.ts`, used for instant slider updates). A unit test feeds the same fixture file to both and asserts identical output.

## 6. Out of scope
Fine-tuning is **supplementary**: only after the app is deployed. Optional: LoRA on a small model with D1 + D2 on the local RTX 3060 for a "before vs after" row; never in the critical path.

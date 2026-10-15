# 04 — Model & Routing Specification

## 1. Signals
For each message the system produces these signals:

| Signal | Source | Output |
|---|---|---|
| S1 intent probs | Decision model (Laya fine-tuned checkpoint on D1) | 15 intent probabilities → aggregated to 5 classes (`order, price_question, delivery_problem, complaint, other`) |
| S2 escalate prob | Decision model `escalate` question (or D1-trained head) | `escalate_prob` ∈ [0,1] |
| S3 scam prob | Scam head (TF-IDF char n-grams + logistic regression trained on D2; optionally ensemble with decision-model `noul` scam question) | `scam_prob` ∈ [0,1] |
| S4 LLM opinion | Groq (fallback Gemini) | `llm_class`, `llm_reason` (one short English sentence), `llm_status` ∈ {ok, unavailable} |

Final 6-class vector = the 5 aggregated classes scaled by `(1 − scam_prob)` plus `scam` = `scam_prob`. Top class and `top_prob` come from this vector.

## 2. Engine selection (Hour-0 bake-off)
Candidates for S1, evaluated on D1 validation (not test) for accuracy, macro-F1, ECE and latency on CPU:
1. Laya fine-tuned checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`, listed at 0.3B) — default.
2. Mercury Decide via OpenRouter free route (hosted; check rate limits, Bangla quality).
3. Span-01 Lite free tier (hosted; same checks).
4. Baseline: TF-IDF char n-gram + logistic regression (CPU, trains in seconds). Also reported on the Evaluation page.
5. Zero-shot Groq (the LLM alone) for reference.

**Decision rule:** pick the engine with the best macro-F1 among those that (a) run within the free budget, (b) hit latency target, (c) have a rate limit that survives judging. Prefer a self-hosted model over a hosted free route because it has no rate limit. Hosted routes may serve as an additional comparison row only.

## 3. Calibration
- Fit **temperature scaling** (single scalar T) on D1 validation / `calibration` split for S1 logits (minimize NLL). If the model only returns probabilities, apply scaling in log-prob space.
- Report ECE (15 bins) before and after, and a reliability diagram data series.
- Scam head: Platt scaling on D2 validation.
- Store parameters in `backend/artifacts/calibration.json`.
- Honest note: the dataset's soft targets (0.90 gold) shape the model's raw confidence, so calibration must be re-fit against hard labels.

## 4. Routing policy (approved)
Inputs: `top_class`, `top_prob`, `scam_prob`, `escalate_prob`, `llm_class`, `llm_status`, threshold τ (default 0.85, slider range 0.50–0.99), `τ_other` = max(0.60, τ − 0.20).

Evaluate in this order, first match wins:

1. **Scam lane:** `scam_prob ≥ 0.50` → lane `scam`. Never auto-handled, regardless of anything else. (Scam threshold 0.50 is fixed and not tied to the slider. Tunable constant `SCAM_T`.)
2. **Review (escalate):** `escalate_prob ≥ 0.50` or the message maps to agent request → lane `review`, reason "Customer may need a human".
3. **Review (low confidence):** if `top_class == other`, require `top_prob ≥ τ_other`, else require `top_prob ≥ τ`; if not met → lane `review`, reason "Low confidence (p = …)".
4. **Review (disagreement):** if `llm_status == ok` and `llm_class ≠ top_class` → lane `review`, reason "Second opinion disagrees (LLM: …)".
5. **Auto:** otherwise → lane `auto`.

Degraded mode: if `llm_status == unavailable`, skip rule 4, and apply a **stricter** confidence requirement `top_prob ≥ min(0.99, τ + 0.05)` for non-`other` classes. The UI shows the banner "Second opinion unavailable — using stricter threshold".

Every routed message stores `lane` and `route_reason` so the UI can show *why*.

## 3.1 Second-signal prompt contract (S4)
- System prompt: classify a customer message sent to an online shop in Bangladesh into exactly one of `order, price_question, delivery_problem, complaint, scam, other`; the message may be Bangla, Banglish or English.
- Output: JSON only: `{"class": "<one of six>", "reason": "<max 15 words, English>"}`.
- Temperature 0; max tokens 80; timeout 3 s; one retry; JSON parse guarded (strip code fences, validate class against the enum, otherwise `unavailable`).
- The LLM is **not** shown the decision model's answer (independence).
- Cache by SHA-256 of normalized text, in memory (LRU 2,000 entries).
- Provider order: Groq → Gemini free → none. Switch on HTTP 429/5xx/timeout. Model names are chosen at Hour 0 against the current free-tier list and kept in `config.py`.
- Key and model rotation: `GROQ_API_KEYS` may hold several comma-separated keys and `GROQ_MODELS` several candidate models (env-overridable). The chain is model-major/key-minor: a 429/5xx rotates to the next key for the current model, a `model_not_found` advances to the next model — so a removed model (which happened to `llama-3.1-8b-instant`) or a rate-limited key degrades one entry at a time instead of killing the second signal.

## 5. Evaluation hooks
The router is a pure function `route(signals, τ) -> (lane, reason)` implemented **twice with identical logic**: Python (`router.py`, used in offline evaluation) and TypeScript (`frontend/lib/route.ts`, used for instant slider updates). A unit test feeds the same fixture file to both and asserts identical output.

## 6. Out of scope
Fine-tuning is **supplementary**: only after the app is deployed. Optional: LoRA on a small model with D1 + D2 on the local RTX 3060 for a "before vs after" row; never in the critical path.

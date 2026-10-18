# 04 — Model & Routing Specification

## 1. Signals
For each message the system produces these signals:

| Signal | Source | Output |
|---|---|---|
| S1 intent probs | Two engines, one active. `tfidf-lr` — the D1-trained TF-IDF char n-grams + logistic regression — is the **default** and the automatic fallback. `laya-ft` — the Laya fine-tuned checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`), the better-measured model (§2.1) — is **opt-in**: loaded only when someone selects it, and refused outright on a host too small to hold it (§2.2) | 15 intent probabilities → aggregated to 5 classes (`order, price_question, delivery_problem, complaint, other`) |
| S2 escalate prob | Escalate head over the same features, Platt-calibrated on D1 validation (notebook §5.1; artifact `escalate_tfidf.joblib`) | `escalate_prob` ∈ [0,1] |
| S3 scam prob | Scam head (TF-IDF char n-grams + logistic regression trained on D2; optionally ensemble with decision-model `noul` scam question) | `scam_prob` ∈ [0,1] |
| S4 LLM opinion | Groq (fallback Gemini) | `llm_class`, `llm_reason` (one short English sentence), `llm_status` ∈ {ok, unavailable} |

Final 6-class vector = the 5 aggregated classes scaled by `(1 − scam_prob)` plus `scam` = `scam_prob`. Top class and `top_prob` come from this vector.

## 2. Engine selection (Hour-0 bake-off)
Candidates for S1, evaluated on D1 validation (not test) for accuracy, macro-F1, ECE and latency on CPU:
1. Laya fine-tuned checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`, 322M mmBERT encoder) — the plan's default candidate. **Measured 2026-10-17, passed the gate, shipped as the opt-in Engine A (§2.1).**
2. Mercury Decide via OpenRouter free route (hosted; check rate limits, Bangla quality). Not pursued — no hosted comparison row was needed once the self-hosted candidate passed.
3. Span-01 Lite free tier (hosted; same checks). Not pursued, same reason.
4. Baseline: TF-IDF char n-gram + logistic regression (CPU, trains in seconds). **Shipped as the backup engine and the automatic fallback (§2.2).**
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

**Decision: the checkpoint is shipped as the opt-in Engine A — `laya-ft` — and `tfidf-lr` is the default.** The gate passed on merit; the deployment set the default. The checkpoint needs ~1.3 GB of RAM and the target free instance has 512 MiB, so making it the default would mean either a dead deploy or a host we do not have. The better model is therefore *available* rather than *running*: one switch away, what a larger host runs, and never loaded until someone asks for it (§2.2). The four objections recorded below are real, and each is answered rather than dropped:

- **Cost inside the free Space.** It adds the `laya` package + CPU torch to the image (~1 GB installed) and 643.8 MB of weights plus a 34.4 MB tokenizer that an ephemeral Space would re-download on every restart (docs/02 §6). The image therefore bakes the weights in at build time and keeps the cache in `HF_HOME` (`backend/requirements-laya.txt`, Dockerfile), so a restart does not race a customer message for a download. Serving RAM goes from the measured ~205 MB to roughly 1.3 GB for a 322M fp32 encoder — which is why the default is the backup: 1.3 GB does not fit in the 512 MiB the free instance offers, and the RAM probe refuses before attempting what would OOM-kill it. Loading the checkpoint in-process takes 12.6 s with the weights cached, and it happens when the engine is selected rather than at boot, so the cost lands on the switch that asked for it, once.
- **Every published number would be invalidated — and is not being faked.** `eval.json` was measured with Engine A = `tfidf-lr` (E1/E2/E3, coverage curve, calibration, scam head) and its own limitations list says so. Rather than hand-edit a measurement, the Evaluation page reports the engine it is serving next to a line stating which engine the numbers below were measured on, and points here for the checkpoint's measurement (docs/07 §7). Re-measuring notebook §8 end to end with the checkpoint is the honest fix and is listed as outstanding in docs/08.
- **The escalate head stays on TF-IDF.** Laya's own `escalate` question returns a mean P(true) of 0.250 on that sample, against the base rate the current Platt-calibrated head and `ESCALATE_T = 0.20` were chosen for. So S1 is the only thing that changed: S2 remains `DecisionEngine.predict_escalate`, whichever engine answers S1. Rule 2 is never pointed at an uncalibrated signal.
- **The number is in-distribution.** The checkpoint was fine-tuned on exactly the corpus we evaluate on — its card lists `nafiullah/bangla-ecom-voice-decisions` and `Badhon/BanglaEComIntent` — so 0.989 means "it learned this corpus", not "it generalises". It has no OOD measurement at all; the conservative number we do have is ours (36.2% 6-class on n=105, docs/07), and it is the baseline's. Putting 0.989 on a product screen would be precisely the overselling this project forbids, so it is not on one.

Laya's numbers therefore live **here, in `ml/laya_gate.py` and in notebook §4.3** — not mixed into the `eval.json` tables on the Evaluation page, which describe the baseline run. The page names the serving engine instead, so the two can never be confused for one another.

### 2.2 Runtime switch, on-demand load, fallback, and what the API reports
Both engines must be switchable, the checkpoint's absence must be survivable (the backup is what a small host gets), and the checkpoint itself must cost nothing to a deployment that does not want it:

- **Nothing loads the checkpoint at boot.** `Pipeline` starts with it unloaded, and the only thing that ever calls `LayaEngine.load()` is an explicit selection: `ENGINE_A=laya-ft` at deploy time, or `POST /api/engine` (the Preferences switch). A 512 MiB instance therefore never meets a model that would kill it, and a deployment that never selects the checkpoint never imports torch at all.
- **The switch pays the load, once.** `POST /api/engine` loads the checkpoint inside the request that asks for it (~12.6 s with the weights cached) rather than making a customer's message pay, and the attempt is memoised and lock-guarded: two racing switches cannot load it twice, and a failed attempt is remembered instead of retried per request. Preferences shows a loading note while that request is in flight.
- `ENGINE_A` (environment, default `tfidf-lr`) selects the engine at boot — and choosing `laya-ft` here *is* a selection, so it is the one path where boot loads the checkpoint. A value that is not one of the two shipped ids falls back to `tfidf-lr` rather than advertising an engine no client can send back.
- `POST /api/engine {"engine": "laya-ft" | "tfidf-lr"}` switches S1 at runtime. An unknown id is a `400` with nothing switched; a known id that cannot load in this deployment is a `200` with `fallback: true` and the engine that is actually serving. Silent success was not an option: the switch is understood, the outcome is different, and the response says which.
- **Availability is reported honestly and cheaply.** `GET /api/config.engines` gives each engine `available`, `active`, and — when it cannot run here — a `reason`: the host probe's sentence, or the load error after an attempt. For the checkpoint `available` means *selectable*, not *running*, and answering it costs a cgroup read rather than a torch import, so the screen can ask on every page load. A disabled option that only said "not available" would be a mystery.
- A missing `laya`/torch/weights is a **supported state**, not a crash: `LayaEngine.load()` catches the failure, logs why, and S1 runs `tfidf-lr`. `/api/health.engine` and `GET /api/config.engines` report which engine answers and which can load here.
- **A host too small to hold the checkpoint is refused up front, never attempted.** 322M parameters in fp32 ≈ 1.3 GB of weights plus the torch runtime, so `LayaEngine.load()` probes total RAM first and declines below **3 GiB**. The probe takes the **smaller** of two numbers: the machine's physical memory (`sysconf`; `GlobalMemoryStatusEx` on Windows, where `sysconf` does not exist) and the container's **cgroup cap** (`/sys/fs/cgroup/memory.max`, cgroup v2; `memory.limit_in_bytes`, v1). The board alone is not enough — `sysconf` reports the machine the cgroup sits on, so a 512 MiB Render instance read as many GiB, the checkpoint was waved through, and the same crash-loop this refusal exists to prevent recurred on 2026-10-17 until the probe became cgroup-aware (`backend/app/engines/laya.py`, tests in `tests/test_engine.py`). The evidence: a Render free instance (512 MiB) was OOM-killed *inside lifespan* — uvicorn never bound its port, Render scanned an unopened port for a minute, and the process crash-looped. Because the probe is import-free it is what `available` and `reason` are answered from, so a small host shows the checkpoint as a disabled option reading "instance has 0.5 GiB RAM, the checkpoint needs >= 3 GiB" — and selecting it anyway changes nothing and says why (docs/06 §4.6). An attempt would kill the deploy.
- **The operator can turn the checkpoint off outright, without depending on that probe.** `LAYA_ENABLED=0` makes `laya-ft` permanently unavailable in that process — never offered, never attempted — and it is checked **before** the RAM probe and beats it, so a deployment that must not carry 1.3 GB of model does not have to trust a cgroup read it may not be able to see. It surfaces the same way as the RAM refusal: `GET /api/config.engines` reports `available: false` with "the checkpoint is disabled on this deployment (LAYA_ENABLED=0)", and selecting it anyway returns `200` with `fallback: true` and keeps the backup serving. Absent, empty or misspelled keeps the default (**enabled**), because a typo in an env var must not silently remove an engine from a deployment that can run it. This is the supported way to run the same code locally (`ENGINE_A=laya-ft`, or the Preferences switch) and disabled where it is deployed.
- **The Laya stack is pinned to the measured pair** — `transformers==4.57.6`, `huggingface_hub==0.36.0`, `tokenizers==0.22.2`, `safetensors==0.7.0` (`backend/requirements-laya.txt`). Unpinned, the first image build pulled `transformers 5.20.1` with `huggingface_hub 2.2.0` — a major line the custom `laya` loader has never run against. The one number this build exists to reproduce must not drift with PyPI.
- A checkpoint that raises mid-request degrades that one message to the backup and the prediction's `engine` field says `tfidf-lr`. No customer message is ever lost to a model error.
- **Temperature scaling applies to `tfidf-lr` only.** The scalar in `calibration.json` was fitted on that model's validation rows; applying it to the checkpoint's probabilities would be a correction belonging to another model — a made-up number.
- The switch is process-wide (one demo deployment, no accounts, no sessions), and the Preferences screen says so instead of implying the choice is per visitor (docs/06 §4.6).

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
- Batch bounds (the chain is bounded per message, not per batch). Evidence: on a Render free instance whose egress to the providers times out, cold start re-walked all ~60 seed messages through the chain (~12 s each: 3 s × one retry × each model entry), uvicorn never bound its port, and the deploy died on Render's `Port scan timeout reached` (2026-10-17). Two bounds make the walk paid once, not N times: (1) **seeding budget** — `_seed_predictions` gives the LLM 30 s (`SEED_LLM_DEADLINE_S`, `main.py`) of wall clock, then classifies the remaining seeds with `classify(..., use_llm=False)`, which is the ordinary degraded-mode prediction: no network, `llm_status: "unavailable"`, identical to missing keys; (2) **failure cooldown** — `LLMClient` trips after 3 consecutive messages with no usable answer (`BREAKER_AFTER_MESSAGES`): for 60 s (`BREAKER_COOLDOWN_S`) calls return `unavailable` without touching the network, cache hits excepted, and the first message after the window probes the chain again. A success resets the streak, so a merely-unlucky message never arms the cooldown.

## 5. Evaluation hooks
The router is a pure function `route(signals, τ) -> (lane, reason)` implemented **twice with identical logic**: Python (`router.py`, used in offline evaluation) and TypeScript (`frontend/lib/route.ts`, used for instant slider updates). A unit test feeds the same fixture file to both and asserts identical output.

## 6. Out of scope
Fine-tuning is **supplementary**: only after the app is deployed. Optional: LoRA on a small model with D1 + D2 on the local RTX 3060 for a "before vs after" row; never in the critical path.

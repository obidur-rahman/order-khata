# 08 — Build Plan (48 hours, solo + AI harness)

Rule: a deployed, working, ugly version beats an unfinished beautiful one. **Deploy by hour 18, then improve.**

Where this plan names an `ml/*.py` script, read it as a section of
`ml/notebooks/order_khata_lab.ipynb`: the pipeline is implemented there and a script is
generated from it if one is ever needed, never hand-written.

## Phase 0 — Hour 0–3: feasibility (gate)
| Task | Pass condition |
|---|---|
| Create HF account, Space (Docker), repo scaffold | Space builds "hello" |
| Load D1, apply mapping, write `01_load_and_map.py` | jsonl splits + data card |
| ✅ Run Laya fine-tuned checkpoint on D1 validation on CPU — **done 2026-10-17**, late: the gate was skipped during Hour 0 and only run after the docs were audited. Loaded, measured: ~45 ms/message, macro-F1 0.9892 vs the baseline's 0.8870 on the same 100 rows (re-runnable: `ml/laya_gate.py`). Rule passes and the candidate is **adopted as Engine A** (`laya-ft`), with `tfidf-lr` kept shipped as a runtime-switchable backup and the automatic fallback (docs/04 §2.1, §2.2) | Loads, latency measured, accuracy recorded, backup switch tested both ways |
| ❌ Try Mercury Decide (OpenRouter free route), Span-01 Lite — not pursued, and recorded as not tried, once the self-hosted candidate passed | Works or marked "unavailable"; limits noted |
| Groq key, JSON-mode test on 30 Banglish messages | ≥ 90% valid JSON, usable accuracy |
| Inspect D2 labels | Scam mapping written down |
**Gate:** if Laya cannot run on free CPU, fall back to TF-IDF/LR as engine A and report honestly; if Groq is unusable, try Gemini free; if both fail, ship decision-model-only mode.

## Phase 1 — Hour 3–10: backend core
- `engines/decision.py`, `engines/scam.py`, `engines/llm.py` (cache, timeout, fallback), `calibrate.py`. Engine A is `engines/laya.py` (adopted) with `decision.py` as the backup path and the permanent S2 head; the switch is `POST /api/engine` + `EngineChoice` on Preferences.
- `router.py` + fixture-based unit tests.
- `db.py`, seed loader, `/api/*` endpoints, simulator.
- `03_calibrate.py`, `04_train_scam_head.py` — **superseded**: calibration (notebook §7) and the scam head (§6) are cells in `ml/notebooks/order_khata_lab.ipynb`, which is the single source of truth for the pipeline.
- **Milestone M1:** `curl POST /api/messages` returns a full `MessageRecord` locally.

## Phase 2 — Hour 10–18: frontend + first deploy
- Next.js scaffold, Tailwind theme tokens, fonts, `lib/api.ts`, `lib/route.ts`, types.
- Inbox screen (list, thread, AI panel, lane tabs, slider). Try It screen.
- Dockerfile multi-stage; deploy to the Space; test cold start.
- **Milestone M2 (hour 18):** public URL: inbox + Try It work end to end.

## Phase 3 — Hour 18–30: product polish
- Landing page, Dashboard, Evaluation page (static placeholder JSON first).
- Resolve action, degraded-mode banner, loading screen, empty/error states.
- Brand polish pass (typography, spacing, chips, animations).
- **Milestone M3:** all five screens live.

## Phase 4 — Hour 30–38: evaluation and rigor
- `05_evaluate.py` → real `eval.json` — **superseded**: section 8 of the notebook writes `eval.json`; `ml/pipeline.py` is generated from the notebook by `nbconvert` as the receipt, never hand-edited.
- **Outstanding after adopting Laya as Engine A:** `eval.json` (and therefore the Evaluation page's tables) was measured with `tfidf-lr`. Until §8 is re-run with the checkpoint, the page reports the serving engine next to a line naming the engine the numbers came from. Re-running it needs a full evaluation pass with the LLM reachable — not a constant edit — so it is tracked here rather than half-done.
- OOD run on BanglaTOD (timeboxed 1 h).
- Latency measured on the deployed Space.
- **Milestone M4:** real numbers on the page.

## Phase 5 — Hour 38–44: hardening
- Rate limiting, input caps, error handling, Groq-down drill (unset the key; verify degraded mode).
- Engine-down drill: run the suite in an interpreter without torch (backup serves, `engine` says so) and with it (checkpoint serves), and switch engines at runtime through `POST /api/engine`.
- Keep-warm ping, load test with 20 rapid messages.
- Mobile layout pass (390 px).
- README, attribution footer, license notes.

## Phase 6 — Hour 44–48: demo
- Record a 90 s backup screen recording (in case of network failure).
- Rehearse `09-DEMO-SCRIPT.md` twice. Freeze the code 2 h before judging.
- Optional stretch (only if everything is green): LoRA before/after row.

## Cut list (cut in this order if behind)
1. Dashboard histogram → keep only stat cards.
2. OOD evaluation → one sentence of limitation instead.
3. Resolve action (P1).
4. Landing-page animations.
5. Simulator (keep the seeded inbox + Try It).
6. Mobile layout.
Never cut: Try It, routing policy, scam rule, degraded mode, Evaluation page limitations.

## Risk register
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Laya too slow/large for free CPU | Med | High | Measured 2026-10-17: **not too slow** (~45 ms per message on the gate's 100 rows, 0.55–1.1 s end-to-end in-process on the dev machine; budget was 1500 ms). The size cost is paid once at image build time (weights baked, `HF_HOME`), and if the checkpoint still cannot load on the Space the app serves `tfidf-lr` and `/api/health` says so — the failure mode is a slower, thinner deployment, never a dead one. |
| Groq/Gemini rate limit during judging | Med | Med | Cache, seed predictions precomputed, degraded mode |
| HF Space cold start / sleep | High | Med | Loading screen, keep-warm ping, open the Space before judging |
| Bangla/Banglish accuracy lower than expected | Med | Med | Report honestly; show by-script table; threshold keeps risk in review |
| Next.js export breaks (dynamic routes) | Low | Med | No dynamic server features; use query params for detail views |
| Disk/memory limit on Space | Low | High | Measure at Hour 0; bake small artifacts only |
| Scope creep | High | High | Cut list; AGENTS.md scope rules |
| Judges challenge "Facebook" claim | Med | Med | Honest framing in pitch and Evaluation page |

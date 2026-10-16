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
| Run Laya fine-tuned checkpoint on D1 validation on CPU | Loads, latency measured, accuracy recorded |
| Try Mercury Decide (OpenRouter free route), Span-01 Lite | Works or marked "unavailable"; limits noted |
| Groq key, JSON-mode test on 30 Banglish messages | ≥ 90% valid JSON, usable accuracy |
| Inspect D2 labels | Scam mapping written down |
**Gate:** if Laya cannot run on free CPU, fall back to TF-IDF/LR as engine A and report honestly; if Groq is unusable, try Gemini free; if both fail, ship decision-model-only mode.

## Phase 1 — Hour 3–10: backend core
- `engines/decision.py`, `engines/scam.py`, `engines/llm.py` (cache, timeout, fallback), `calibrate.py`.
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
- OOD run on BanglaTOD (timeboxed 1 h).
- Latency measured on the deployed Space.
- **Milestone M4:** real numbers on the page.

## Phase 5 — Hour 38–44: hardening
- Rate limiting, input caps, error handling, Groq-down drill (unset the key; verify degraded mode).
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
| Laya too slow/large for free CPU | Med | High | Hour-0 gate; TF-IDF fallback; smaller checkpoint |
| Groq/Gemini rate limit during judging | Med | Med | Cache, seed predictions precomputed, degraded mode |
| HF Space cold start / sleep | High | Med | Loading screen, keep-warm ping, open the Space before judging |
| Bangla/Banglish accuracy lower than expected | Med | Med | Report honestly; show by-script table; threshold keeps risk in review |
| Next.js export breaks (dynamic routes) | Low | Med | No dynamic server features; use query params for detail views |
| Disk/memory limit on Space | Low | High | Measure at Hour 0; bake small artifacts only |
| Scope creep | High | High | Cut list; AGENTS.md scope rules |
| Judges challenge "Facebook" claim | Med | Med | Honest framing in pitch and Evaluation page |

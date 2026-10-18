# 02 — Technical Requirements Document (TRD): Order Khata

## 1. Architecture
```
Browser (Next.js static export, Tailwind)
   │  HTTPS, JSON, polling every 2 s
   ▼
FastAPI (one container, one free Hugging Face Space, port 7860)
   ├── serves /  → built frontend (out/ directory)
   ├── /api/*    → REST endpoints
   ├── Engine A: Laya fine-tuned checkpoint (322M mmBERT, torch CPU, in-process),
   │              switchable at runtime back to the TF-IDF baseline, which is also
   │              the automatic fallback (docs/04 §2.1, §2.2)
   ├── Scam head: small TF-IDF + logistic regression (and/or decision-model noul question)
   ├── Engine B: Groq LLM (second signal) via HTTPS, key in Space secret
   ├── Router: applies policy (doc 04) → lane
   ├── SQLite file (messages, predictions, resolutions) — re-seeded on boot
   └── Simulator: background task replays held-out messages into inbox
```
Everything is one deployable. No separate frontend host, no external DB.

## 2. Stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) with `output: 'export'`, TypeScript, Tailwind CSS | Static export only: no SSR, no server actions, no `next/image` optimizer (`images.unoptimized: true`) |
| Fonts | Bricolage Grotesque (display), Inter (body), IBM Plex Mono (labels), Noto Sans Bengali | Loaded via `next/font` at build time |
| Backend | Python 3.11, FastAPI, Uvicorn | |
| Model runtime | **Engine A is the TF-IDF baseline by default**; the Laya checkpoint (docs/04 §2.1) is opt-in and loaded on demand: CPU-only torch + `laya`, weights baked into the image at build time, ~12.6 s to load with the cache warm, inference in-process. S2/S3 and the backup S1 are scikit-learn joblib artifacts (~5 MB, `backend/artifacts/`). **Nothing here is required to boot:** without torch/laya/weights — or on a host too small to hold 1.3 GB of weights — the app serves on `tfidf-lr` and `/api/health` says so | The PyTorch path has the cost the gate flagged (≈1 GB of packages, 644 MB of weights, ~1.3 GB serving RAM), which is why the 512 MiB free instance does not run it by default: the checkpoint loads only when a visitor selects it (docs/04 §2.2), and the RAM probe refuses before attempting what would OOM-kill the deploy. The image pays the package cost once at build time instead of per ephemeral restart |
| Baselines | scikit-learn (TF-IDF char n-grams + logistic regression) | Also used as the scam head |
| DB | SQLite via SQLModel (or plain `sqlite3`) | File at `/data/order_khata.db`; ephemeral on free Spaces, re-seeded at startup |
| Second signal | Groq chat-completions API (JSON output) | Key `GROQ_API_KEY` as Space secret. Fallback: Gemini free tier (`GEMINI_API_KEY`) |
| Hosting | Hugging Face Space, SDK: Docker | `app_port: 7860` |

## 3. Repository layout
```
order_khata/
├── AGENTS.md
├── docs/                      # these documents
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, static mount, lifespan (load models, seed DB)
│   │   ├── config.py          # env vars, thresholds, class list, label maps
│   │   ├── schemas.py         # Pydantic models
│   │   ├── db.py              # SQLite engine, tables, seed
│   │   ├── text.py            # normalization + script detection (bn/bl/en/mx)
│   │   ├── pipeline.py        # classify orchestration: engines → calibration → router
│   │   ├── engines/
│   │   │   ├── laya.py        # Engine A (opt-in): checkpoint → 5 base classes; optional import,
│   │   │   │                  # loaded only when selected; missing torch/weights or too
│   │   │   │                  # little RAM → loaded=False → backup serves
│   │   │   ├── decision.py    # 15-intent probs → 5-class probs, + calibrated escalate head
│   │   │   │                  # (Engine A when Laya is absent, S2 always)
│   │   │   ├── scam.py        # scam probability (artifact-backed; no keyword fallback)
│   │   │   ├── llm.py         # Groq/Gemini second signal + cache + fallback
│   │   │   └── calibrate.py   # temperature scaling (fitted for tfidf-lr — never applied to Laya)
│   │   ├── router.py          # routing policy
│   │   ├── simulator.py       # background replay
│   │   └── api/               # route modules (messages, inbox, misc)
│   ├── data/                  # prepared splits (parquet/jsonl), seed inbox json
│   ├── artifacts/             # calibration params, decision/escalate/scam joblib, eval results json
│   ├── requirements.txt       # base image: no torch (the backup must install anywhere)
│   └── requirements-laya.txt  # Engine A's optional half, installed by the Dockerfile
├── ml/                        # offline work (not shipped in the Space image)
│   ├── notebooks/
│   │   └── order_khata_lab.ipynb   # THE pipeline: `Restart & Run All` re-derives every
│   │                               # artifact under backend/ — load+map D1, baseline,
│   │                               # Laya gate (run 2026-10-17, then shipped as the
│   │                               # opt-in Engine A), escalate head, scam head,
│   │                               # calibration, evaluation, export contract (see docs/03 §6)
│   ├── laya_gate.py           # §4.2's harness as a re-runnable script; refuses to print a
│   │                          # candidate number until it reproduces the baseline's
│   └── artifacts/             # gitignored: LLM answer cache, figures
├── frontend/
│   ├── app/                   # routes: /, /inbox, /try, /dashboard, /evaluation,
│   │                          # /preferences
│   ├── components/
│   ├── lib/                   # api client, routing recompute (route.ts), types,
│   │                          # brand/hooks/store helpers, prefs.ts (theme +
│   │                          # language), prefKeys.ts (their storage keys,
│   │                          # shared with the pre-paint script), i18n.ts
│   │                          # (interface strings),
│   │                          # parity_runner.ts (feeds fixtures to the parity test)
│   └── next.config.mjs
├── tests/                     # pytest suite; fixtures/route_cases.json is fed
│   ├── fixtures/              # to BOTH router.py and route.ts (parity test)
│   └── test_*.py              # router, parity, label mapping, API schema, scam invariant
├── Dockerfile
└── README.md                  # HF Space front matter lives here
```

There is no `ml/pipeline.py` yet. If a runnable script is ever needed it is **generated**
from the notebook (`jupyter nbconvert --to script ml/notebooks/order_khata_lab.ipynb
--output-dir ml`), never hand-written: the routing policy already exists twice (Python and
`frontend/lib/route.ts`) and is parity-tested, so a third hand-made copy would drift
silently. The notebook's own inlined copies of `config.py` / `router.py` / `text.py` /
`calibrate.py` / `decision.aggregate_intents` / `llm.py` are extracted back into those
files as part of the port (notebook section 11).

## 4. Request flow (classify)
1. `POST /api/messages` with `{text, conversation_id?, sender_name?}`.
2. Normalize text (strip, collapse whitespace, replace unencodable lone surrogates with U+FFFD; keep original). Detect script (bn / bl / en / mx) with a Unicode-range heuristic.
3. Engine A (`tfidf-lr` by default; the `laya-ft` checkpoint when it has been selected and loaded) returns 15 intent probabilities → aggregated into 5 base classes; the calibrated S2 head returns `escalate_prob` (always `tfidf-lr`, docs/04 §2.2).
4. Scam head returns `scam_prob`; the 6-class vector is the 5 base classes scaled by `(1 − scam_prob)` plus `scam`.
5. Engine B (Groq) returns `{class, reason}`; 3 s timeout; cached by SHA-256 of normalized text. On failure, `llm_status = "unavailable"`.
6. Router computes the lane from stored signals and τ (doc 04).
7. Persist message + prediction; return the full record. Frontend recomputes lane locally when the slider moves.

## 5. Non-functional requirements
| Area | Requirement |
|---|---|
| Latency | p50 ≤ 1.5 s per classify including Groq; decision-model-only ≤ 300 ms target (verify in Hour 0) |
| Availability | Works with Groq/Gemini both down |
| Cost | $0; no paid services |
| Security | API keys only server-side; no keys in frontend or repo; CORS limited to same origin; rate-limit `/api/messages` per IP (e.g. 30/min, in-memory); input length cap 1,000 chars; HTML-escape all rendered text |
| Privacy | No real personal data; seed data uses fictional customer names; pasted messages are stored only in the ephemeral DB |
| Observability | Log per-request latency, engine statuses, lane; `/api/health` reports model loaded + LLM status + **which engine A engine is answering** (a deployment running the checkpoint must not look identical to one running the backup) |
| Cold start | Show an intentional loading screen; optional external keep-warm ping before judging |

## 6. Deployment
- Multi-stage Dockerfile: (1) Node stage builds frontend → `out/`; (2) Python slim stage installs requirements, copies backend and `out/`, runs `uvicorn app.main:app --host 0.0.0.0 --port 7860`.
- Space secrets: `GROQ_API_KEY`, optional `GEMINI_API_KEY`, optional `HF_TOKEN`. Engine A also reads two plain variables: `ENGINE_A` (which engine to start on) and `LAYA_ENABLED=0` (turn the checkpoint off in that deployment entirely, docs/04 §2.2).
- Engine A's weights are **baked at build time** (`HF_HOME=/opt/hf-cache` + one `snapshot_download` in the Dockerfile), because accepting a 644 MB re-download on every ephemeral restart while a customer message waits is not a demo. The small joblib artifacts (~5 MB) ship in the image as before.
- README front matter: `sdk: docker`, `app_port: 7860`.

## 7. Licensing and attribution
- Intent data is CC BY-NC-SA 4.0 (derivative of BanglaEComIntent): non-commercial; credit both datasets in the app footer and README.
- Smishing dataset: check license on the card (listed as MIT in search results; verify).
- The fine-tuned Laya checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`) is **CC BY-NC-SA 4.0** — non-commercial, same family as D1. Verified on the card 2026-10-17; the earlier note that Laya was "listed as Apache-2.0" was true only of the *base* model (`convaiinnovations/laya-multilingual`), the Laya code and mmBERT (MIT) inside it. **It is shipped now** (the opt-in Engine A, docs/04 §2.1), so the non-commercial terms apply to this build, and the credit goes in the footer and README like D1's. (OpenJev weights, if ever used, are non-commercial too — none of these are in the image.)

# 02 — Technical Requirements Document (TRD): Order Khata

## 1. Architecture
```
Browser (Next.js static export, Tailwind)
   │  HTTPS, JSON, polling every 2 s
   ▼
FastAPI (one container, one free Hugging Face Space, port 7860)
   ├── serves /  → built frontend (out/ directory)
   ├── /api/*    → REST endpoints
   ├── Engine A: TF-IDF char n-grams + logistic regression, CPU, in-process
   │              (joblib artifacts; Laya passed the gate but is not adopted — docs/04 §2.1)
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
| Model runtime | **No torch in the served image.** Engine A and the scam/escalate heads are scikit-learn joblib artifacts (~5 MB, `backend/artifacts/`) loaded at boot; inference is CPU-only and in-process | The Laya candidate's PyTorch path was measured during the gate (docs/04 §2.1) and is deliberately not shipped: 1 GB of torch + 644 MB of weights re-downloaded on every ephemeral-Space restart |
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
│   │   │   ├── decision.py    # 15-intent probs → 5-class probs, + calibrated escalate head
│   │   │   ├── scam.py        # scam probability (artifact-backed; no keyword fallback)
│   │   │   ├── llm.py         # Groq/Gemini second signal + cache + fallback
│   │   │   └── calibrate.py   # temperature scaling
│   │   ├── router.py          # routing policy
│   │   ├── simulator.py       # background replay
│   │   └── api/               # route modules (messages, inbox, misc)
│   ├── data/                  # prepared splits (parquet/jsonl), seed inbox json
│   ├── artifacts/             # calibration params, decision/escalate/scam joblib, eval results json
│   └── requirements.txt
├── ml/                        # offline work (not shipped in the Space image)
│   ├── notebooks/
│   │   └── order_khata_lab.ipynb   # THE pipeline: `Restart & Run All` re-derives every
│   │                               # artifact under backend/ — load+map D1, baseline,
│   │                               # Laya gate (run 2026-10-17), escalate head, scam head, calibration,
│   │                               # evaluation, export contract (see docs/03 §6)
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
2. Normalize text (strip, collapse whitespace; keep original). Detect script (bn / bl / en / mx) with a Unicode-range heuristic.
3. Engine A returns 15 intent probabilities → aggregated into 6 class probabilities; also `escalate_prob`.
4. Scam head returns `scam_prob`.
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
| Observability | Log per-request latency, engine statuses, lane; `/api/health` reports model loaded + LLM status |
| Cold start | Show an intentional loading screen; optional external keep-warm ping before judging |

## 6. Deployment
- Multi-stage Dockerfile: (1) Node stage builds frontend → `out/`; (2) Python slim stage installs requirements, copies backend and `out/`, runs `uvicorn app.main:app --host 0.0.0.0 --port 7860`.
- Space secrets: `GROQ_API_KEY`, optional `GEMINI_API_KEY`, optional `HF_TOKEN`.
- Model weights fetched at boot into the HF cache; if the Space disk is ephemeral, accept re-download on restart (verify size/time in Hour 0). Prefer baking small artifacts (calibration params, scam model) into the image.
- README front matter: `sdk: docker`, `app_port: 7860`.

## 7. Licensing and attribution
- Intent data is CC BY-NC-SA 4.0 (derivative of BanglaEComIntent): non-commercial; credit both datasets in the app footer and README.
- Smishing dataset: check license on the card (listed as MIT in search results; verify).
- The fine-tuned Laya checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`) is **CC BY-NC-SA 4.0** — non-commercial, same family as D1. Verified on the card 2026-10-17; the earlier note that Laya was "listed as Apache-2.0" was true only of the *base* model (`convaiinnovations/laya-multilingual`), the Laya code and mmBERT (MIT) inside it. Not shipped, but any future adoption inherits the NC terms. (OpenJev weights, if ever used, are non-commercial too — none of these are in the shipped image.)

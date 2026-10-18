---
title: Order Khata
emoji: 📬
colorFrom: yellow
colorTo: black
sdk: docker
app_port: 7860
pinned: false
---

# Order Khata

**Your shop's inbox, sorted.**

Order Khata reads every customer message sent to a small online shop in **Bangla,
Banglish or English**, sorts it into **Order / Price / Delivery / Complaint /
Scam / Other** with a calibrated confidence score, auto-handles the clear ones,
and sends the unsure, conflicting or scam-like ones to a **human review queue**
instead of guessing.

> *The sorting is automatic. The risky decisions stay with you.*

One free Hugging Face Space (Docker, port 7860) serves both the API and the
static frontend. **Cost: $0.**

## Quick start (local)

Requirements: Python 3.11+, Node 20+. Run every command from the repo root.

**Linux / macOS (bash):**

```bash
pip install -r requirements.txt          # 1. backend deps
(cd frontend && npm install && npm run build)   # 2. static export -> frontend/out
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 7860   # 3. run
```

**Windows (PowerShell or cmd):**

```powershell
pip install -r requirements.txt

cd frontend
npm install
npm run build
cd ..

cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 7860
```

Use `python -m uvicorn` (not bare `uvicorn`, which is often not on PATH on
Windows). Open <http://127.0.0.1:7860>. The landing page, inbox, Try It,
Dashboard and Evaluation screens all work against the same server.

**Stop:** Ctrl+C in that terminal. If a restart fails with
`Only one usage of each socket address` / `Errno 10048`, a previous run is
still holding the port:

```powershell
netstat -ano | findstr :7860      # then, with the listed PID:
taskkill /PID <pid> /F            # Windows    (kill <pid> on POSIX)
```

### Frontend development (hot reload, optional)

Two terminals: the backend on 7860, the dev server on 3000.

```bash
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 7860   # terminal 1
cd frontend && npm run dev                                                    # terminal 2
```

Open <http://localhost:3000>. The dev server finds the API through
`frontend/.env.development` (`NEXT_PUBLIC_API_BASE=http://127.0.0.1:7860`),
which `next dev` reads and `next build` ignores, so no env var is needed on
the command line, and the backend allows this dev origin (localhost:3000) via
CORS. If you change the API port, change it there too.

The production path needs no env var at all: the built `frontend/out` is
served same-origin from the backend on 7860.

### Tests

```bash
python -m pytest tests/ -q        # router, parity, label mapping, API, scam invariant, LLM rotation
cd frontend && npx eslint .       # lint
```

The routing policy exists **twice on purpose**: Python (`backend/app/router.py`)
and TypeScript (`frontend/lib/route.ts`), so the threshold slider recomputes
lanes client-side with zero network. `tests/test_parity.py` feeds the same
fixtures to both via Node and asserts byte-identical output. **Change one,
change both.**

## Configuration (`.env`, never committed)

The backend reads a `.env` at the repo root (real environment variables always
win; on the Space they come from Space secrets):

| Variable | Required | Meaning |
|---|---|---|
| `GROQ_API_KEYS` | optional | One or more Groq keys, comma-separated. Rotated automatically on 429/5xx; the app degrades gracefully without any. |
| `GROQ_MODELS` | optional | Model candidates in preference order (default: `qwen/qwen3.8-27b,openai/gpt-oss-20b`). A removed model falls through to the next. |
| `GEMINI_API_KEY` | optional | Fallback second signal after all Groq entries fail. |
| `HF_TOKEN` | optional | Hugging Face token for model downloads (server-side only). |
| `ENGINE_A` | optional | Which engine the process starts on: `tfidf-lr` (default) or `laya-ft` (opts into loading the checkpoint at boot). Anything else falls back to `tfidf-lr`; `POST /api/engine` switches at runtime. |
| `LAYA_ENABLED` | optional | Set `0` to turn the checkpoint off entirely in this deployment: never offered, never loaded, even on a host that could hold it. Anything else (including absent or misspelled) leaves it enabled. |
| `ORDER_KHATA_DB` | optional | SQLite path (default `backend/data/order_khata.db`; ephemeral, re-seeded at boot). |

With no keys configured the app runs in **degraded mode**: decision-model-only,
stricter confidence threshold, visible banner. This is a supported mode, not a
failure state.

## Engine A (which model reads the messages)

Two engines can drive S1, and they are one switch apart:

| Engine | What it is | When it runs |
|---|---|---|
| `tfidf-lr` | TF-IDF char n-grams + logistic regression | **The default.** Fast, small, no torch — and the only one the 512 MiB free instance can hold |
| `laya-ft` | The Laya fine-tuned checkpoint (`nafiullah/laya-multilingual-bn-ecom-voice`), a 322M encoder that answers typed decisions rather than generating text | **Opt-in.** Better macro-F1 on our own validation set, but it needs ~1.3 GB of RAM, so it runs only when someone selects it |

The checkpoint is **not loaded at boot.** It loads when it is selected — the control on
the Preferences screen, or `POST /api/engine` — and that request pays the ~13 s load, so
no customer's message ever does. `ENGINE_A=laya-ft` selects it at deploy time.

A host that cannot hold it is never asked to try: below **3 GiB** of RAM (the machine's
or the container's cgroup cap, whichever is smaller) the probe refuses before importing
torch, and `GET /api/config.engines` reports the checkpoint as unavailable *with the
reason* — which is why a 512 MiB instance shows it greyed out with `instance has
0.5 GiB RAM, the checkpoint needs >= 3 GiB` instead of dying. Missing torch/weights is
a **supported state, not a crash**: the app serves on the backup and `/api/health` +
`GET /api/config.engines` report which engine is answering and which can load. Asking
for an engine this deployment cannot run returns `200` with `fallback: true`, never a
silent no-op. To run the checkpoint locally: `pip install torch --index-url
https://download.pytorch.org/whl/cpu && pip install -r backend/requirements-laya.txt`
(then `python -c "import laya;
laya.load('nafiullah/laya-multilingual-bn-ecom-voice')"` once to fetch ~644 MB; the
loaded model is ~1.3 GB, so the machine needs ≥ 3 GiB of RAM). A venv created by `uv`
does not have `pip` in it — use `uv pip install --python .venv/Scripts/python.exe …`.
To make one machine start on the checkpoint without changing any deployment, put
`ENGINE_A=laya-ft` in the repo-root `.env`: that file is gitignored.

Where it must be off regardless of what the host reports, set **`LAYA_ENABLED=0`**: the
checkpoint is then never offered and never attempted, and `GET /api/config.engines` says
`the checkpoint is disabled on this deployment (LAYA_ENABLED=0)`. That is the supported
way to run it locally and disable it where it is deployed, without depending on the RAM
probe reading the host correctly.

Why it was chosen on merit, what it costs, and what it does **not** fix are measured in
`docs/04` §2.1; §2.2 covers the switch and the on-demand load. `ml/laya_gate.py` re-runs
the comparison and refuses to print a candidate number until it has reproduced the
baseline's.

## How a message is routed

1. `scam_prob ≥ 0.70` → **Scam lane**, never auto-handled (hard invariant, unit-tested).
2. `escalate_prob ≥ 0.20` on the *calibrated* escalate score (e.g. the customer
   asks for a human) → **Review**.
3. Confidence below the threshold τ (default 0.85; `other` uses `max(0.60, τ−0.20)`;
   degraded mode uses `τ+0.05`) → **Review**.
4. The independent LLM second signal disagrees **and the model is not decisive
   (`top_prob < 0.90`)** → **Review**. The LLM is a tie-breaker, not an oracle:
   measured on test, the model was right 96% of the time where the LLM disagreed
   with a call at ≥ 0.90 and the LLM 23%, so an unconditional veto cost accuracy
   *and* coverage.
5. Otherwise → **Auto**.

τ is a slider in the UI: raise it and more messages move to human review.
That coverage/accuracy dial is the product. At τ = 0.85 the auto lane holds 53.6%
of the inbox at 94.2% accuracy. Coverage is bounded because messages that ask for
a person, and messages the model is unsure about, are never auto-answered
(`docs/07` §5 works through the arithmetic).

With no trained artifacts the engine returns a flat distribution and everything
goes to review with `model_loaded: false` on `/api/health`. There is no keyword
fallback: it looked like a second opinion without being one. The default engine is
a real model trained on the data, not a heuristic — which is what makes calling it
an engine honest rather than a euphemism for "no engine".

## Deploy (Hugging Face Space)

This repo's root front matter declares `sdk: docker`, `app_port: 7860`, and the
multi-stage `Dockerfile` builds the static frontend with Node and serves it from
Python slim. Space secrets (`GROQ_API_KEYS`, etc.) go under *Settings → Secrets*.

The container needs two things the lab generates, both committed on purpose:
`backend/artifacts/*.joblib` (the shipped engines; without them the Space boots
degraded) and `backend/data/seed_inbox.json` (the demo inbox).

The checkpoint (Engine A's opt-in half) adds CPU torch + `laya` and downloads the
644 MB weights **during the build** (`HF_HOME=/opt/hf-cache`), so a restart never
re-fetches it and the model is ready the moment someone selects it — nothing loads
it at boot. Expect a bigger image and a slower first build; the pins and the index
URL are in `backend/requirements-laya.txt`. `Dockerfile` itself has **not** been
built locally (no Docker on the dev machine); treat the first Space build as the
test, and the app serves the backup engine until the checkpoint is selected.

## Data & honesty

- Intent data: public Bangla e-commerce customer-message corpus (derivative of
  **BanglaEComIntent**, CC BY-NC-SA 4.0, non-commercial).
- Scam data: Bengali SMS smishing corpus (MIT).
- The inbox in this demo is **simulated**; there is no live Facebook/Meta
  integration (that needs app review; it is the planned next step).
- Engine A: `nafiullah/laya-multilingual-bn-ecom-voice` (CC BY-NC-SA 4.0,
  non-commercial — the base model, the Laya code and mmBERT inside it are
  Apache-2.0/MIT, the fine-tune is not). Shipped in this build as the opt-in
  engine — loaded only when it is selected; see `docs/04` §2.1–2.2.
- The corpus is largely machine-generated; the Evaluation page states every
  limitation and shows real numbers only after the notebook's evaluation section runs.
- `backend/artifacts/eval.json` was measured with Engine A = `tfidf-lr`. The
  Evaluation page shows which engine is serving next to that, and the checkpoint's
  own measurement lives in `docs/04` §2.1 / `ml/laya_gate.py` — the two are never
  mixed into one table.
- The data is **not** real Facebook seller messages.

## Repo layout

```
backend/app/     FastAPI: engines (laya, decision+escalate, scam, llm, calibrate), router, db, API
frontend/        Next.js static export: app/ screens, components/, lib/ (route.ts twin)
tests/           pytest suite; fixtures/route_cases.json feeds BOTH router implementations
ml/              the notebook that *is* the pipeline, plus its caches under ml/artifacts/
docs/            PRD, TRD, data/routing/API/UI/evaluation specs, build plan, demo script
```

Start with `docs/00-README.md`. Hackathon rules of engagement: `AGENTS.md`.

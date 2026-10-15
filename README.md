---
title: Dokanbox
emoji: 📬
colorFrom: yellow
colorTo: black
sdk: docker
app_port: 7860
pinned: false
---

# Dokanbox

**Your shop's inbox, sorted.**

Dokanbox reads every customer message sent to a small online shop in **Bangla,
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

Use `python -m uvicorn` (not bare `uvicorn` — it is often not on PATH on
Windows). Open <http://127.0.0.1:7860> — the landing page, inbox, Try It,
Dashboard and Evaluation screens all work against the same server.

**Stop:** Ctrl+C in that terminal. If a restart fails with
`Only one usage of each socket address` / `Errno 10048`, a previous run is
still holding the port:

```powershell
netstat -ano | findstr :7860      # then, with the listed PID:
taskkill /PID <pid> /F            # Windows    (kill <pid> on POSIX)
```

### Frontend development (hot reload, optional)

The dev server needs to know where the API is; the backend allows this
dev-origin (localhost:3000) via CORS.

```powershell
cd frontend
$env:NEXT_PUBLIC_API_BASE="http://127.0.0.1:7860"; npm run dev   # Windows
# NEXT_PUBLIC_API_BASE=http://127.0.0.1:7860 npm run dev        # bash
```

Open <http://localhost:3000>. The production path needs no env var: the built
`frontend/out` is served same-origin from the backend on 7860.

### Tests

```bash
python -m pytest tests/ -q        # router, parity, label mapping, API, scam invariant, LLM rotation
cd frontend && npx eslint .       # lint
```

The routing policy exists **twice on purpose** — Python (`backend/app/router.py`)
and TypeScript (`frontend/lib/route.ts`) — so the threshold slider recomputes
lanes client-side with zero network. `tests/test_parity.py` feeds the same
fixtures to both via Node and asserts byte-identical output. **Change one,
change both.**

## Configuration (`.env`, never committed)

The backend reads a `.env` at the repo root (real environment variables always
win — on the Space these come from Space secrets):

| Variable | Required | Meaning |
|---|---|---|
| `GROQ_API_KEYS` | optional | One or more Groq keys, comma-separated. Rotated automatically on 429/5xx; the app degrades gracefully without any. |
| `GROQ_MODELS` | optional | Model candidates in preference order (default: `qwen/qwen3.8-27b,openai/gpt-oss-20b`). A removed model falls through to the next. |
| `GEMINI_API_KEY` | optional | Fallback second signal after all Groq entries fail. |
| `HF_TOKEN` | optional | Hugging Face token for model downloads (server-side only). |
| `DOKANBOX_DB` | optional | SQLite path (default `backend/data/dokanbox.db`; ephemeral, re-seeded at boot). |

With no keys configured the app runs in **degraded mode**: decision-model-only,
stricter confidence threshold, visible banner. This is a supported mode, not a
failure state.

## How a message is routed

1. `scam_prob ≥ 0.50` → **Scam lane**, never auto-handled (hard invariant, unit-tested).
2. `escalate_prob ≥ 0.50` (e.g. the customer asks for a human) → **Review**.
3. Confidence below the threshold τ (default 0.85; `other` uses `max(0.60, τ−0.20)`;
   degraded mode uses `τ+0.05`) → **Review**.
4. The independent LLM second signal disagrees → **Review**.
5. Otherwise → **Auto**.

τ is a slider in the UI: raise it and more messages move to human review.
That coverage/accuracy dial is the product.

## Deploy (Hugging Face Space)

This repo's root front matter already declares `sdk: docker`, `app_port: 7860`.
The multi-stage Dockerfile (Node builds `frontend/out` → Python slim serves it)
ships with Phase 2 of `docs/08-BUILD-PLAN.md` — until then the local Quick start
above is the way to run Dokanbox, and Space secrets (`GROQ_API_KEYS`, etc.)
go under *Settings → Secrets* whenever the container lands.

## Data & honesty

- Intent data: public Bangla e-commerce customer-message corpus (derivative of
  **BanglaEComIntent**, CC BY-NC-SA 4.0 — non-commercial).
- Scam data: Bengali SMS smishing corpus (MIT).
- The inbox in this demo is **simulated**; there is no live Facebook/Meta
  integration (that needs app review — it is the planned next step).
- The corpus is largely machine-generated; the Evaluation page states every
  limitation and shows real numbers only after `ml/05_evaluate.py` runs.
- The data is **not** real Facebook seller messages.

## Repo layout

```
backend/app/     FastAPI: engines (decision, scam, llm, calibrate), router, db, API
frontend/        Next.js static export: app/ screens, components/, lib/ (route.ts twin)
tests/           pytest suite; fixtures/route_cases.json feeds BOTH router implementations
ml/              offline scripts: data prep, bake-off, calibration, evaluation
docs/            PRD, TRD, data/routing/API/UI/evaluation specs, build plan, demo script
```

Start with `docs/00-README.md`. Hackathon rules of engagement: `AGENTS.md`.

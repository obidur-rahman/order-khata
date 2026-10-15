# AGENTS.md — rules for the coding harness (OpenCode)

You are building **Dokanbox**, a 48-hour hackathon project. Read `docs/00-README.md` first, then the doc relevant to your task. The docs are the source of truth; if code and docs disagree, ask or update the doc in the same change.

## Hard constraints
- **$0.** No paid API, no paid hosting. Everything runs in one free Hugging Face Space (Docker, port 7860).
- Frontend: Next.js with `output: 'export'` (static). **No SSR, no server actions, no route handlers, no `next/image` optimization.** Tailwind. TypeScript.
- Backend: FastAPI (Python 3.11). SQLite. One container serves the API and the static frontend.
- Never put API keys in code, logs, or the frontend. Use environment variables / Space secrets.
- Light mode only. Follow `docs/06-UI-BRAND-SPEC.md` tokens exactly.

## Honesty rules (do not violate in UI copy or docs)
- Never call the data "real Facebook seller messages". Say "public Bangla e-commerce customer-message corpus" and "simulated Page inbox".
- Show limitations on the Evaluation page as specified in `docs/07`.
- Never hardcode accuracy numbers. All displayed metrics come from `backend/artifacts/eval.json`.

## Scope discipline
- P0 features first (`docs/01`). Do not add: auth, accounts, reply composer, live Meta integration, dark mode, extra screens.
- The routing logic exists twice (Python and TypeScript). Any change to one requires the same change to the other and a passing parity test.
- Scam rule is a hard invariant: `scam_prob ≥ SCAM_T` → never lane `auto`. Keep a unit test for it.
- Degraded mode (LLM unavailable) must always work.

## Working style
- Small, verifiable steps. After each milestone, run the app and a smoke test (`curl /api/health`, classify three messages: Bangla, Banglish, English).
- Prefer simple code over abstractions. No new dependencies without a reason in the commit message.
- Keep files under ~300 lines; split by responsibility following the layout in `docs/02`.
- Write tests for: router, label mapping, API schema, scam invariant.
- Commit messages: imperative, one concern each.

## Definition of done (per task)
Code runs locally, matches the spec, has a test where listed above, no secrets, docs updated if behavior changed.

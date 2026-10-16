# Order Khata — Documentation Index

**Tagline:** Your shop's inbox, sorted.
**One line:** Order Khata reads every customer message sent to a small online shop in Bangla, Banglish or English, sorts it into Order / Price / Delivery / Complaint / Scam / Other with a calibrated confidence score, auto-handles the clear ones, and sends the unsure ones to a human review queue instead of guessing.
**Context:** 48-hour solo hackathon. Zero budget. Everything must run on a free Hugging Face Space.

## Documents

| # | File | Purpose |
|---|------|---------|
| 01 | `01-PRD.md` | Product: problem, users, scope, features, success criteria |
| 02 | `02-TRD.md` | Technical architecture, stack, deployment, repo layout |
| 03 | `03-DATA-SPEC.md` | Datasets, label mapping, splits, licensing |
| 04 | `04-MODEL-ROUTING-SPEC.md` | Engines, calibration, second signal, routing policy |
| 05 | `05-API-SPEC.md` | Backend endpoints, schemas, database schema |
| 06 | `06-UI-BRAND-SPEC.md` | Brand, palette, typography, screens, components |
| 07 | `07-EVALUATION-PLAN.md` | Metrics, baselines, protocol, honest limitations |
| 08 | `08-BUILD-PLAN.md` | 48h schedule, Hour-0 tests, cut list, risks |
| 09 | `09-DEMO-SCRIPT.md` | 3-minute pitch and judge Q&A |
| — | `../AGENTS.md` | Rules for the coding harness (OpenCode) |

## Decision log (who decided what)

| Decision | Value | Decided by |
|---|---|---|
| Time / team | 48 h, solo, with AI coding harness | User |
| Budget | $0, no paid API | User |
| Engine | Open typed-decision model (Laya, fine-tuned checkpoint) as primary; candidates Mercury Decide (OpenRouter free route), Span-01 Lite; chosen by Hour-0 bake-off | User + Claude |
| Second signal | Groq free tier; fallback other free LLM (e.g. Gemini free tier) | User |
| Stack | Next.js (static export) + Tailwind; FastAPI; SQLite | User (frontend/backend), Claude (SQLite) |
| Hosting | One free Hugging Face Space (Docker) | User |
| Data | `nafiullah/bangla-ecom-voice-decisions` + Bengali SMS smishing set; secondary data only, no user-collected data | User + Claude |
| Honest framing | Data is described as a public Bangla e-commerce customer-message corpus, NOT as real Facebook seller DMs | Claude (recommended), user accepted data plan |
| Classes | Order, Price question, Delivery, Complaint, Scam, Other (+ escalate flag) | User approved |
| Screens | Landing, Inbox, Try It, Threshold slider, Dashboard, Evaluation, Preferences. No reply composer | User approved |
| Visual | Light **and dark**, visitor-selected; colourful brand, type- and colour-led; poster-style landing + restrained app | User approved (dark mode added on request, docs/06 §2) |
| Feel | Soft: warm ink instead of black, one radius scale on every surface, soft shadows instead of hard rules (docs/06 §2.1) | User approved (softening pass on request) |
| Language | Bangla / English interface toggle, saved on the device; class names and metrics stay English (docs/06 §4.6) | User approved |
| Name | Order Khata | User (renamed from the Claude proposal ``Dokanbox``) |
| Routing policy | See `04-MODEL-ROUTING-SPEC.md` | User approved |

## Items that MUST be verified in Hour 0 (not yet confirmed)
1. Laya fine-tuned checkpoint loads on HF free CPU and its latency per message.
2. Mercury Decide / Span-01 Lite free access, rate limits, Bangla/Banglish accuracy.
3. Groq free-tier model choice, rate limit, Bangla quality, JSON-mode reliability.
4. Exact label values of the smishing dataset (classes, and what "promo" means).
5. HF free Space CPU/RAM/disk limits and cold-start time.

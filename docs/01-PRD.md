# 01 — Product Requirements Document (PRD): Order Khata

## 1. Problem
Small online sellers in Bangladesh run their shops through Facebook Page inboxes. A seller can receive hundreds of messages a day in Bangla, Banglish (romanized Bangla) and English. Today every message is read and sorted by hand. Order messages get buried under price questions, delivery complaints wait while the seller answers "hi", and scam attempts (fake payment claims, advance-payment fraud, phishing links) look like normal chat.

## 2. Product
Order Khata is a triage inbox. It reads each incoming message and:
1. Classifies it: **Order, Price question, Delivery, Complaint, Scam, Other**.
2. Attaches a **calibrated confidence score** and a one-line reason.
3. **Auto-handles** clear messages; routes **unsure, conflicting, angry or scam-like** messages to a **human review queue** rather than guessing.

Core promise: *"The sorting is automatic. The risky decisions stay with you."*

## 3. Users
- **Primary: the shop owner / admin** (solo seller, 20–500 messages/day). Non-technical. Wants to see only the messages that need attention.
- **Secondary: hackathon judges.** Open a public URL, paste their own messages, and watch the queue sort itself. Must understand the product in under 30 seconds.

## 4. Goals and non-goals
**Goals (hackathon)**
- G1. Judges open a public URL and use a real-looking inbox with no login.
- G2. Judges can paste any Bangla / Banglish / English message and see it classified and routed live.
- G3. Show an honest trade-off: coverage handled automatically vs accuracy on that slice, adjustable with a threshold slider.
- G4. Zero cost, zero paid API.

**Non-goals**
- Live Facebook/Meta integration (needs app review). The demo simulates a Page feed; the architecture has a webhook-shaped adapter only.
- Auth, multi-tenant accounts, billing.
- Reply composer / auto-reply.
- Image or voice messages.
- Training a model from scratch.

## 5. Features
| ID | Feature | Priority |
|---|---|---|
| F1 | Inbox: conversation list, thread view, AI panel (class chip, confidence bar, reason, signals) | P0 |
| F2 | Three lanes: Auto-handled / Needs review / Scam alerts, with counts | P0 |
| F3 | Try It: paste a message, see it classified and added to the inbox | P0 |
| F4 | Threshold slider (τ): messages move between Auto and Review live | P0 |
| F5 | Routing policy (see `04`): dual-signal agreement, escalate flag, asymmetric scam rule | P0 |
| F6 | Human resolve action in the review queue (confirm or correct the label) | P1 |
| F7 | Dashboard: auto vs review split, class distribution, confidence histogram, "time saved" estimate | P1 |
| F8 | Evaluation page: accuracy, calibration, coverage-accuracy curve, OOD result, limitations | P0 |
| F9 | Landing page (poster-style) with "Open live inbox" | P1 |
| F10 | Live simulator: background feed replays held-out messages into the inbox | P1 |
| F11 | Graceful degradation: banner when second signal is unavailable | P0 |

## 6. Success criteria
- **Demo:** a judge pastes 3 messages (one each in Bangla, Banglish, English) and sees correct routing in under 3 seconds each.
- **Quality:** report macro-F1 on held-out test; at the default τ, auto-handled slice accuracy ≥ 90% with coverage ≥ 60% (targets; report actuals honestly).
- **Safety:** scam messages are never auto-handled in the demo (hard rule, tested).
- **Availability:** app works when Groq is down (decision-model-only mode).
- **Cost:** $0.

## 7. Narrative and honesty rules
- Data is described as "a public Bangla e-commerce customer-message corpus" and an SMS-style scam corpus. It is **not** called real Facebook seller messages.
- The UI is a simulated Page inbox; this is stated once on the Evaluation page and in the pitch.
- The corpus is largely machine-generated; this is stated on the Evaluation page.

## 8. Risks (product)
- Class "Delivery" contains many pre-purchase delivery questions, not only problems. UI label is "Delivery".
- Scam data is SMS-style, so real DM scams may differ (domain shift, disclosed).
- Free-tier rate limits during judging (mitigated by caching and fallback).

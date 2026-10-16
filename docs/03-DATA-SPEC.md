# 03 — Data Specification

Secondary public data only. No user-collected data. No paid data.

## 1. Sources
| ID | Source | Use | Size | License | Notes |
|---|---|---|---|---|---|
| D1 | HF `nafiullah/bangla-ecom-voice-decisions`, config `intent` | Primary intent data (train/val/test) | 7,032 rows (5,432 / 794 / 806) | CC BY-NC-SA 4.0 | Scripts: bn, bl, en, mx. Fields: text, intent (15), script, bangla_text, alt_intent, escalate. Derivative of `Badhon/BanglaEComIntent` |
| D1b | Same dataset, config `laya` | Ready typed-decision cases with soft targets; `calibration` split for temperature scaling | 19,412 cases | CC BY-NC-SA 4.0 | Use `calibration` and `test` only if not retraining |
| D2 | HF `Piash2026/bengali-sms-smishing-dataset` (duplicate of `sujonsamir/...`) | Scam class | 7,005 SMS, 3 classes, 4 language varieties | MIT (verify) | SMS-style: domain shift vs DMs. Inspect labels in Hour 0 |
| D3 | HF `afri7here/BanglaTOD` | Out-of-distribution check | 209 dialogues, 64 intents, bn/en/bl aligned | check card | E-commerce domain has 25 dialogues, 10 intents. Timebox mapping |
| D4 | Mendeley "Financial scams detection dataset" (DOI 10.17632/znsk27yk3h.1) | Optional extra real scam/ham test set | small | check | Real scam and ham messages, English and Bangla; labeled scam/ham |
| D5 | HF `learn-abc/banking14-intents-en-bn-banglish` | Optional only; banking domain | 134k | MIT | Do NOT use for main evaluation (wrong domain) |

Do **not** use BanglaPhish-2026 (explicitly synthetic).

## 2. Label mapping (D1 → Order Khata classes)
| Order Khata class (key) | UI label | D1 intents |
|---|---|---|
| `order` | Order | product_search, product_availability, order_cancel |
| `price_question` | Price | price_inquiry, discount_offer |
| `delivery_problem` | Delivery | shipping_delivery, order_status |
| `complaint` | Complaint | complaint, return_refund, payment_issue |
| `scam` | Scam | (not in D1; from D2) |
| `other` | Other | greeting, goodbye, thanks, out_of_scope, agent_request |

- `agent_request` maps to `other` but always has `escalate = 1`, so it goes to Needs review.
- `escalate` is taken from D1's `escalate` field (policy-derived, not ground truth; state this).
- Known caveat: `shipping_delivery` is mostly pre-purchase delivery questions (charges, areas, time). The UI says "Delivery", not "Delivery problem".
- `alt_intent` (1,397 rows) marks genuinely ambiguous messages: use for analysis (are low-confidence cases the ambiguous ones?).

## 3. Scam labels (D2)
- Inspect the three D2 classes in Hour 0 (one appears to be `promo`).
- Plan: smishing/scam class → `scam` positives; ham/normal → negatives for the scam head only; `promo` → excluded from training unless it clearly reads as fraud.
- Scam head is binary (scam vs not). It does not need to predict the 5 other classes.
- Because D1 contains no scam and D2 contains no shop chat, build a **combined scam evaluation set**: D2 held-out scam + D2 ham + D1 test messages as hard negatives (shop chat that must NOT be flagged). Report false-alarm rate on D1 negatives explicitly.

## 4. Splits and leakage rules
- D1: use its provided train / validation / test. **Test is touched once**, for final numbers.
- τ and calibration are fit on validation / `calibration` only.
- Deduplicate: remove D1 train rows with near-duplicate text to any test row (the `laya` config already did cosine ≥ 0.98 dedupe; if retraining from `intent`, repeat with a quick char n-gram check).
- D2: 70/15/15 stratified split with a fixed seed (42), dedupe first.
- Note: the existing fine-tuned Laya checkpoint was trained on D1's training data, so D1 test is in-distribution. D3 is the OOD check.

## 5. Seed inbox (demo data)
- Build ~60 conversations from D1 **test** messages (stratified across classes and scripts) plus ~8 scam messages from D2 test, wrapped in fictional customer names and shop context.
- Fictional names only (e.g. mix of common Bangla and English first names); no real people.
- The simulator replays further test messages every 6–10 s (configurable) with random class mix.
- Seeds are **held-out test data**, so the live demo numbers are legitimate, but the final reported accuracy is computed offline on the full test split, not from the demo.

## 6. Preparation outputs (notebook sections 1–2)
- `backend/data/d1_{train,val,test}.jsonl` with fields: `id, text, script, intent, cls, escalate, alt_intent`.
- `backend/data/d2_{train,val,test}.jsonl` with: `id, text, script, is_scam`.
- `backend/data/seed_inbox.json`.
- A `data_card.md` generated with counts per class × script.

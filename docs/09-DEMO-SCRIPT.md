# 09 — Demo Script (3 minutes) and Judge Q&A

## Before you start
Open the Space 10 minutes early (wake it). Have the backup video ready. Slider at τ = 0.85. Simulator running.

## 0:00–0:25 — Problem
"A small Facebook-page shop gets hundreds of messages a day in Bangla, Banglish and English. The owner sorts them all by hand. Orders get buried, scams look like normal chat. Order Khata sorts the inbox for them."

## 0:25–1:15 — Product tour (Inbox)
- Show three lanes with live counts. "Handled for you: clear messages. Needs your eyes: the system wasn't sure, or the customer is angry. Scam alerts: never auto-handled."
- Click an Auto item: show class, confidence, second-opinion agreement.
- Click a Review item: show the reason ("Second opinion disagrees"). "It asks instead of guessing."

## 1:15–2:00 — Judge participation (Try It)
Invite a judge to paste any message. Suggested: one Banglish order, one Bangla price question, one scam-like message. Show lane and reason each time. Then drag the slider: "Raise the threshold and more messages move to human review. This is the safety dial."

## 2:00–2:40 — Rigor (Evaluation page)
Show the coverage-vs-accuracy curve: "At this setting the system handles X% automatically at Y% accuracy; the rest goes to a human." Show calibration and OOD numbers. Show the limitations box: "The corpus is largely machine-generated and the scam data is SMS-style. We say so."

## 2:40–3:00 — Close
"Free to run, works when the AI provider is down, built on open models. The next step is a Messenger integration, which needs Meta app review, so today's demo is a simulated Page feed."

## Judge Q&A
| Question | Answer |
|---|---|
| Is this real Facebook data? | No. Public Bangla e-commerce customer-message corpus plus an SMS scam corpus; the inbox is simulated. Real DMs are the next validation step. |
| Why not just call an LLM? | Two reasons: a decision model gives calibrated per-class probabilities in one pass (the confidence is the product), and we use the LLM only as an independent second opinion. Results show the dual-signal gain (E1 vs E2 vs E3). |
| What happens when it's wrong? | Wrong-but-confident is the risk; calibration plus agreement plus the threshold target it. Scams never auto-handle. Review items are resolved by a human. |
| What if the AI API is down? | Degraded mode: decision model only, stricter threshold, visible banner. |
| How does it scale? | Decision model is a single forward pass on CPU; the LLM call is optional and cached. |
| Why not fine-tune? | Existing fine-tuned open checkpoint used; LoRA before/after is a stretch item. |
| Privacy? | No real personal data; demo storage is ephemeral. |
| Cost? | $0: free Hugging Face Space, open model, free-tier LLM. |

# 06 — UI & Brand Specification

**Principle:** it must look and behave like a real production SaaS. Light mode only. Colorful brand, type-led. Restrained, dense, work-tool layout inside the app; bold poster-style on the landing page.

## 1. Brand
- **Name:** Dokanbox (দোকানবক্স in Bangla wordmark variant)
- **Tagline:** Your shop's inbox, sorted.
- **Logo:** black rounded-square with a yellow inbox-tray glyph; wordmark in Plus Jakarta Sans ExtraBold, lowercase `dokanbox`.
- **Voice:** short, confident, plain. No AI jargon on the main screens ("Needs your eyes", "Handled for you").

## 2. Color tokens (CSS variables / Tailwind theme)
| Token | Hex | Use |
|---|---|---|
| `--ink` | #0F0F0F | Text, logo, primary buttons |
| `--paper` | #FBF8F1 | App background (warm off-white) |
| `--surface` | #FFFFFF | Cards, panels |
| `--line` | #E8E2D4 | Borders, dividers |
| `--muted` | #6B665B | Secondary text |
| `--brand` | #FFD60A | Brand yellow: hero, primary accents, selected states |
| `--brand-deep` | #E6BE00 | Hover |
| Class: Order | #2F6BFF | blue chip |
| Class: Price | #7A4DFF | violet chip |
| Class: Delivery | #0FA3A3 | teal chip |
| Class: Complaint | #FF4D8D | pink chip |
| Class: Scam | #E5252A | red chip |
| Class: Other | #8A8A8A | gray chip |
| Lane: Auto | #17A34A | green |
| Lane: Review | #F59E0B | amber (always with icon + text) |
| Lane: Scam | #E5252A | red |

Rules: brand yellow is never used for status. Status always pairs color with an icon and a text label (accessibility). Chips use a 12% tint background with full-color text; verify text contrast ≥ 4.5:1 (darken text color when needed). Yellow backgrounds carry `--ink` text only.

## 3. Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Landing headline | Plus Jakarta Sans | 800 | clamp(48px, 8vw, 112px), tight leading 0.95, tracking −0.03em |
| H1 / H2 | Plus Jakarta Sans | 800 / 700 | 32 / 24 |
| Body, UI | Inter | 400/500/600 | 14–15 |
| Message text | Inter + Noto Sans Bengali fallback | 400 | 15, line-height 1.6 |
| Numbers (stats) | Plus Jakarta Sans tabular | 800 | 36–56 |
Font stack must put a Bengali-capable font in the fallback so Bangla never renders as boxes: `"Inter","Noto Sans Bengali",system-ui,sans-serif`.

## 4. Screens
### 4.1 Landing `/`
Full-bleed black and yellow, diagonal asymmetric grid, huge headline: **"Sort the noise. Keep the sale."**, subline one sentence, primary button **Open the live inbox**, secondary **See the evaluation**. Three colored feature blocks (Sorts Bangla, Banglish, English / Asks a human when unsure / Never auto-handles scams). Footer: dataset credits and "demo uses a simulated Page feed".

### 4.2 Inbox `/inbox` (main product)
- Top bar: logo, shop switcher (static "Rina's Fashion House · Page"), threshold slider (label "Confidence threshold", value shown, live counters "Auto 38 · Review 14 · Scam 3"), health dot.
- Lane tabs under top bar: All / Handled for you (green) / Needs your eyes (amber) / Scam alerts (red), each with count.
- Left (≈320 px): conversation list. Row: avatar (colored initial), name, last message preview, time, class chip, tiny confidence ring.
- Center: thread view, chat bubbles, original script preserved. Review items show a sticky banner with the route reason and buttons **Confirm "{class}"** / **Change to…** (resolve action).
- Right (≈340 px): AI panel. Class chip large, confidence bar with the threshold tick, six-class probability bars, "Second opinion" row with LLM class + reason (or "unavailable"), route reason, latency.
- Scam rows have a red left border and a shield icon; the thread shows a warning card with plain advice ("Do not send items or advance payments").
- New messages animate in (slide + highlight for 1.5 s) when polled.

### 4.3 Try It `/try`
Large textarea with 6 example chips (two per script) and a Classify button. Result card appears with the same AI panel and a "Added to inbox" link. Shows the lane transition when the slider is changed.

### 4.4 Dashboard `/dashboard`
Four big stat cards (Messages today, Handled automatically %, Needs review, Scams caught), class distribution bar, confidence histogram with the threshold line, "Estimated time saved" (messages auto × 20 s; label it an estimate and state the assumption), recent activity.

### 4.5 Evaluation `/evaluation`
Headline numbers (macro-F1, accuracy, ECE before/after), coverage-vs-accuracy curve with the current τ marked, per-class table, in-distribution vs out-of-distribution rows, baselines table, a "What this does not show" box (machine-generated corpus, SMS-style scam data, simulated inbox). Data from `/api/eval`.

## 5. Components (build once, reuse)
`ClassChip, ConfidenceBar, ProbBars, LaneTabs, ThresholdSlider, ConversationRow, MessageBubble, AIPanel, ResolveBar, StatCard, Histogram, CoverageCurve, HealthDot, LoadingScreen, EmptyState`.
Charts: plain SVG or a small library (Recharts) — no heavy dependencies.

## 6. Interaction rules
- Slider changes recompute lanes client-side instantly (no network) using `lib/route.ts`.
- Polling every 2 s for new inbox items; pause polling when the tab is hidden.
- Optimistic UI for resolve.
- Loading: a branded loading screen while `/api/health` reports not ready (cold start).
- Responsive: desktop-first (judges), usable at 390 px: single column with bottom lane tabs.
- Empty/error states are designed, never blank.

## 7. Accessibility
Keyboard-navigable lanes and list, visible focus ring (ink + yellow), `aria-live="polite"` for new messages, color never the only status carrier.

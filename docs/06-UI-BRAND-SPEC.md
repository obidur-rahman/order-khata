# 06 — UI & Brand Specification

**Principle:** it must look and behave like a real production SaaS. One editorial world: soft ink on warm paper, a quiet mono label layer, oversized display type, **one radius scale and a soft shadow for anything raised**, a single electric-blue accent, and a muted hue per class. Restrained and dense inside the app; a long-form editorial product story on the landing page. Nothing is pure black or pure white, and nothing is a hard corner. Ships in **light and dark**; the visitor picks (see §4.6).

**Theme rule:** every colour is a CSS variable declared twice: on `:root` (light) and on `.dark` (dark). Components never write `dark:` classes for colour, they just use the token (`bg-paper`, `text-ink`, `border-line`). `lib/prefs.ts` puts the class on `<html>`; `app/layout.tsx` applies the saved choice before first paint so there is no flash.

## 1. Brand
- **Name:** Order Khata (অর্ডার খাতা in Bangla wordmark variant)
- **Tagline:** Your shop's inbox, sorted.
- **Logo:** the mark is artwork, not drawn paths: `frontend/public/logo_light.png` and `logo_dark.png` are the 500×500 RGBA masters (rounded tile baked into the alpha, transparent corners, so it sits on any surface without a mask). What ships are the downscaled `-96.png` / `-192.png` derivatives, loaded through `srcSet` + `sizes`: a 24px mark costs ~6 KB instead of ~100 KB, and nothing in the app fetches a master. The pair swaps on the `.dark` class in CSS only (`.logo-swap`, `app/globals.css`), so the right artwork is on screen from the first frame: no JavaScript, no `dark:` class in a component, no flash. The wordmark stays real text (Bricolage Grotesque ExtraBold, title case `Order Khata`) so it keeps the display metrics and scales with the mark. `next/image` is not used anywhere: the Space serves a static export, so there is no optimizer to delegate to.
- **Voice:** short, confident, plain, warm. No AI jargon on the main screens ("Needs your eyes", "Handled for you"). Prefer a sentence a shop owner would say over a sentence a product page would say.

## 2. Color tokens (CSS variables / Tailwind theme)
An ink/paper base, one accent, a muted hue per class, and one semantic red. The accent means **"this needs your eyes / your action"**: it marks the review lane, actions and links, never a class. The dark column is the whole "dark theme": no second palette lives anywhere else (including TypeScript: `lib/brand.ts` points at the runtime variables).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | #262520 | #E4E1D8 | Text, primary buttons. Warm charcoal, never pure black |
| `--paper` | #F6F4EF | #151412 | App background |
| `--surface` | #FFFEFB | #1F1E1B | Cards, panels |
| `--line` | #E9E4D8 | #2D2B26 | Hairline borders, dividers |
| `--muted` | #6F6A5E | #A49E91 | Secondary text (4.9:1 on paper by day, 6.9:1 by night) |
| `--contrast` | #262520 | #26241F | Inverted block (safety dial, closing CTA). Stays dark in both themes |
| `--oncontrast` | #F6F4EF | #F1EFE8 | Text on the inverted block |
| `--accent` | #2B46E0 | #8A9BFF | The one accent: review lane, actions, links, selected states |
| `--accent-deep` | #1E33BD | #AAB6FF | Hover on the accent |
| `--accent-tint` | #EAEDFD | #232A4A | Accent wash (selected rows, tinted section band) |
| `--on-auto` / `--on-review` / `--on-scam` | #8FD6AB / #9DB0FF / #E2A09A | same | Lane hues tuned for `--contrast`; never used on paper |
| `--c-order` (Order) | #3B62D9 | #8AA4FF | blue |
| `--c-price` (Price) | #6C53CC | #B8A2FF | violet |
| `--c-delivery` (Delivery) | #2F8F86 | #6FD3C7 | teal |
| `--c-complaint` (Complaint) | #B45C7E | #F0A2C0 | rose |
| `--c-other` (Other) | #8F8B83 | #B5AFA4 | warm grey |
| `--c-scam` (Scam) | #C03B34 | #FF8F86 | the one semantic red |
| `--lane-auto` (Auto) | #2F7A4F | #63C184 | green (handled) |
| `--lane-review` (Review) | #1A3AFF | #8A9BFF | accent |
| `--lane-scam` (Scam) | #C03B34 | #FF8F86 | red |

Two vocabularies, and only two. Tailwind utilities get a `--color-*` entry in `@theme` (`--color-ink: var(--ink)` → `bg-paper`, `text-ink`, `border-line`). The class and lane hues do not: they have no utility, so they are read as-is (`--c-order`, `--lane-auto`, `--lane-auto-deep`) by `lib/brand.ts` and applied inline: one spelling per token, never an alias. Class and lane hues also carry a `-deep` variant for text and filled chips; in dark the deep variant is the *lighter* one, because it has to carry text on a dark surface.

Rules: the accent is never used for status. Status always pairs colour with an icon and a text label (accessibility). Each class keeps a real but muted hue so probability bars and distributions read at a glance; class chips are capsules with a mono label and a small round swatch, so the label always carries the meaning and colour never does. One semantic red survives for scam because it has to read as a warning, not a hue. Verify text contrast ≥ 4.5:1 in **both** themes and adjust the token that carries text. Colour is never the only carrier in either theme.

Backgrounds may be colourful (§4.1 uses a multi-hue field). That colour lives in `background-image` washes (`.wash`, `.wash-warm`) built from `color-mix` over the same tokens, so a wash is automatically correct in the dark theme.

### 2.1 Shape and depth
Softness is a system, not a decoration. Two token families carry it, and nothing else invents a radius or a shadow:

| Token | Value | Use |
|---|---|---|
| `--radius-lg` | 16px | Small controls: buttons, inputs, selects, avatars |
| `--radius-xl` | 20px | Insets inside a card (message slips, callouts, code) |
| `--radius-2xl` | 24px | Cards and panels — the default surface |
| `--radius-3xl` | 30px | The hero-scale blocks: the dial, the closing CTA, the error panel |
| `rounded-full` | 999px | Chips, pills, the lane tabs, the segmented control, progress bars |

These override Tailwind's own `--radius-*` values in `@theme`, so `rounded-2xl` means 24px everywhere. `@layer base` also rounds `button`, `input`, `select` and `textarea` by default, so a new control cannot arrive square.

| Token | Use |
|---|---|
| `--shadow-soft` | A resting card. Barely there: 1px contact + one wide, low-opacity bloom |
| `--shadow-lift` | Hover, selection, and anything floating (the resolve bar, the error panel, the closing CTA) |

The shadow colour lives in `--shadow-1` / `--shadow-2`, which are warm and shallow by day and deepened in dark mode: a soft edge has to read against near-black. A raised surface lifts with this shadow *instead of* a hard 2px border; every `border-2` in the old spec is now `border` + radius.

## 3. Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Landing headline | Bricolage Grotesque | 800 | clamp(44px, 9vw, 132px), leading 0.92, tracking −0.04em |
| H1 / H2 | Bricolage Grotesque | 800 / 700 | 32 / 24 |
| Body, UI | Inter | 400/500/600 | 14–15 |
| Message text | Inter + Noto Sans Bengali fallback | 400 | 15, line-height 1.6 |
| Numbers (stats) | Bricolage Grotesque tabular | 800 | 36–56 |
| Mono label / eyebrow / index | IBM Plex Mono | 400/500 | 10–11px, tracking 0.08–0.10em, uppercase |

Wide tracking (0.14em+) reads as technical, not friendly, so the mono layer stays at 0.08–0.10em and the `.label` class sets the upper bound.

Font stack must put a Bengali-capable font in the fallback so Bangla never renders as boxes: `"Inter","Noto Sans Bengali",system-ui,sans-serif`.

## 4. Screens
### 4.1 Landing `/`
A long-form editorial product story, not a hero-and-buttons page: the problem, how it works (five steps on one rail), the lanes, the safety dial (an interactive τ illustration using the same `route()` as the server), rigor (headline numbers read from `artifacts/eval.json`, and "not yet evaluated" until it runs), and built honest (provenance + limits). Sections are separated by **space, not rules** (no hairline dividers between sections), and they carry **no section labels or eyebrow titles**: the display headline is the heading. There are no "01 / 02" numbers.

Hero: oversized tight display type **"Sort the noise. Keep the sale."**, centred on the screen, over a full-bleed colour field (`.wash`: accent, price-violet, complaint-rose and delivery-teal radial washes, plus four slowly drifting token-coloured orbs — everything drawn from the palette so dark mode works). No dateline row: the tagline and the "simulated Page feed" label were removed from the hero on request, and the simulation is still disclosed in the footer and on the Evaluation page. The hero closes with a static legend of the six classes. No scroll cue, no ring control. Primary button **Open the live inbox**, secondary **See the evaluation**. Footer: an oversized brand closing block (logo, wordmark, blurb, CTA) over the same colour field, with the five section links and the honesty line (simulated Page feed · dataset credits · legal) in a slim strip beneath it.

Nav: one shared top bar (§5 `TopBar`) on every screen, **fully transparent**: no fill, no blur, no edge fade; the bar is a frame, not a panel. The section links sit centred on the bar's own axis on desktop, and in a centred row beneath it on mobile, inside a segmented control that carries no background either: the active item is an accent wash, never an ink (black) pill. **No in-page anchor links**; the landing's own sections are not navigation targets.

### 4.2 Inbox `/inbox` (main product)
- Top bar: the shared `TopBar` (§4.1): logo, shop switcher (static "Rina's Fashion House · Page"), threshold slider (label "Threshold τ", value shown, live counters "Auto 38 / Review 14 / Scam 3"), language + appearance toggles, health dot. Page links live in the segmented control with an ink fill on the active one.
- Lane tabs under top bar: All / Handled for you / Needs your eyes / Scam alerts, each with a count. Lane colour is icon + text first; the icons colour auto (green), review (accent) and scam (red).
The screen is a **fixed app shell**: the bar holds still and each pane scrolls on its own, so a long conversation list can never push the thread off the screen. Breakpoints are CSS classes only — no `window.innerWidth` read at render time, which would be wrong on the first frame and blind to a resize.

| Width | Panes | Lanes | Details |
|---|---|---|---|
| `< md` (phones) | one at a time: list ↔ thread (back arrow in the thread header) | bottom bar: All / Auto / Review / Scam, short label + count + lane icon, the active cell tinted with a lane-coloured rule on top | a tap away: the thread's details deck, collapsed by default |
| `md`–`xl` | list (336 px) \| thread | tabs above the list, engine status at the far right of the same strip | the same deck, still on request |
| `≥ xl` (1280 px) | list (376 px) \| thread \| AI rail (340 px) | tabs above the list | permanently on screen as the rail |

- Left: conversation list. Row: avatar (rounded ink tile with the customer's initial), name, last message preview, time, class chip, tiny confidence ring, plus a lane word for anything that is not handled — `needs you` in the accent for review rows, `shielded` for scam — and `resolved` / `new` state. The active row gets an accent left rule and an accent-tint background.
- Center: thread view, chat bubbles (a card on the paper, capped at a readable line length), original script preserved. The control bar under the chat holds, in order: the **resolve banner** on review items — an accent-bordered wash carrying the route reason and the buttons **Confirm "{class}"** / **Change to…** (resolve action) — and then the details deck.
- Details deck (below xl): the AI detail panel behind one toggle, capped at 55% of the pane height and scrolling inside itself, so an open panel can never swallow the conversation. At xl the same panel is the rail instead, and the deck is not rendered.
- Rail (≥ xl): AI panel. Class chip large, confidence bar with the threshold tick, six-class probability bars, "Second opinion" row with LLM class + reason (or "unavailable"), route reason, latency.
- Scam rows have a red left rule and a shield icon; the thread shows a warning card with plain advice ("Do not send items or advance payments").
- New messages animate in (slide + accent flash for 1.5 s) when polled.
- One measured column (46 rem) carries the messages, the warning card and the control bar, so a 1920 px window does not stretch a chat line across the screen.

### 4.3 Try It `/try`
Large textarea with 6 example chips (two per script) and a Classify button. Result card appears with the same AI panel and an "Open the inbox" link. Shows the lane transition when the slider is changed.

### 4.4 Dashboard `/dashboard`
Four big stat cards (Messages today, Handled automatically %, Needs review, Scams caught), class distribution bar, confidence histogram with the threshold line, "Estimated time saved" (messages auto × 20 s; label it an estimate and state the assumption), recent activity.

### 4.5 Evaluation `/evaluation`
Headline numbers (macro-F1, accuracy, ECE before/after), coverage-vs-accuracy curve with the current τ marked, per-class table, in-distribution vs out-of-distribution rows, baselines table, a "What this does not show" box (machine-generated corpus, SMS-style scam data, simulated inbox). Data from `/api/eval`.

### 4.6 Preferences `/preferences`
The screen that asks how the app should read. Three choice groups, each a stack of large tappable rows with the current one marked:

- **Language:** English / বাংলা. Sets `lang` on `<html>` and switches the interface strings (`lib/i18n.ts`).
- **Appearance:** Light / Dark. Sets the `.dark` class on `<html>` (§2) and `color-scheme` so native controls follow.
- **Classification engine** (docs/04 §2.2, below the fold of the other two): the adopted Laya checkpoint, or the TF-IDF backup. Each row carries its raw engine id and whether it is the one running.

The first two apply instantly, are saved on the device in `localStorage` (`order_khata.lang`, `order_khata.theme`), and are mirrored by a compact toggle in the top bar so they are one tap away on every screen. Nothing about them is sent to the backend; there is no account. A live row at the bottom previews the three lane labels in the chosen language.

**The engine group is different in kind, and the screen says so** (`pref.engineHint`): it is the *server's* setting. `POST /api/engine` switches S1 for the whole deployment — every visitor gets the change — and it is deliberately not stored on the device. A row for an engine this deployment cannot load is rendered disabled with `not available in this deployment` rather than hidden, and a switch that the server understood but could not honour reports the fallback in plain words instead of silently doing nothing.

**Language scope (deliberate):** the chrome and the narrative are translated: navigation, headings, buttons, the landing story, the footer, lane labels. Two things stay English: the six class names (they are the model's output labels and appear verbatim in the API contract, `docs/05`) and the detection internals (engine names, ECE, macro-F1, τ). Body copy inside Inbox / Dashboard / Evaluation is still English; add keys to `lib/i18n.ts` when that changes.

## 5. Components (build once, reuse)
`TopBar / AppBar, PrefsControls, ClassChip, LaneChip / LaneIcon, ConfidenceBar, ProbBars, LaneTabs, ThresholdSlider, ConversationRow, MessageBubble, AIPanel, ResolveBar, StatCard, Histogram, CoverageCurve, HealthDot, LoadingScreen, ErrorScreen, EmptyState, Reveal`. Landing primitives: `Section, SectionHead, ArrowLink, PrimaryCTA, GhostCTA`.
Charts: plain SVG only, no chart dependency.

## 6. Interaction rules
- Slider changes recompute lanes client-side instantly (no network) using `lib/route.ts`.
- Polling every 2 s for new inbox items; pause polling when the tab is hidden.
- Optimistic UI for resolve.
- Loading: a branded loading screen while `/api/health` reports not ready (cold start).
- Responsive: desktop-first (judges), usable at 390 px — one pane at a time with the lane bar at the bottom (§4.2). Every pane scrolls itself inside an `h-dvh` shell; the page itself never scrolls, so nothing can be clipped out of reach.
- Empty/error states are designed, never blank. When the API is unreachable the app screens show `ErrorScreen`: an explanation, the start command, the underlying error, and a Retry button. Never an endless spinner.
- Honour `prefers-reduced-motion` (loops stop, feedback stays; the hero orbs and scroll reveals switch off) and `prefers-reduced-transparency` (any translucency goes solid).
- Theme and language live in `localStorage` and are applied by `lib/prefs.ts`; a custom event (`order_khata:prefs`) tells every mounted control to re-read, so no provider is needed. τ needs no event: `lib/store.ts` saves it and each screen reads it on mount. The language/theme choice is applied by an inline script in `app/layout.tsx` before first paint (keys from `lib/prefKeys.ts`, shared with `lib/prefs.ts`).
- Press feedback lands on pointer-down (`:active` scale 0.98), never only on release.

## 7. Accessibility
Keyboard-navigable lanes and list, visible focus ring (accent outline + a soft accent halo, never pure black), `aria-live="polite"` for new messages, color never the only status carrier. Both theme and language controls are real buttons with `aria-pressed` / `aria-current` and accessible names, and text contrast is verified in both themes (§2).

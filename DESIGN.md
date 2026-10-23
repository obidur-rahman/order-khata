# Order Khata — DESIGN.md

## Brief
A triage inbox for small Bangla e-commerce shops. Audience: a shop owner who reads
Bangla, Banglish and English in one feed, and hackathon judges who decide in 30 seconds.
The site's job: prove that three scripts get sorted correctly and that the risky calls
stay human. Constraint: static export, one free container, $0.

## Phase 1 — three concepts (different territories)

### A. The exercise khata (name)
The site is the shop's school exercise book: one red margin rule, thin rules across,
brown-paper cover, page numbers in the margin, entries written in by hand.
Layout: every block hangs off one fixed red margin line; page numbers in the margin.
Motion verb: *write and page-turn.* Signature: the page turn between screens.
Anchor: khata is a household object, not an accountant's ledger.
Scores: originality 3, fit 4, feasibility 4, portability 2 → 13.

### B. The three scripts (material of the profession)
The material is not paper, it is script. The page is the same message in three hands:
Bangla, Banglish, English. Layout is a *spread*: what arrived on the left page, what the
system decided on the right, with the gutter as the boundary between human and machine.
Motion verb: *stamp and file.* Signature: the gutter sort — stamps land on the right page
as the left page receives messages, live, using the shipped router.
Anchor: no other inbox looks like a Bangla-English shop; portability is near zero.
Scores: originality 4, fit 5, feasibility 5, portability 1 → 15.

### C. The threshold (formal system)
One line governs everything: τ. The page is organised above and below a single rule;
dragging it re-sorts the page's own content.
Layout: one horizontal rule, content classified by side. Motion verb: *slide and settle.*
Signature: a draggable threshold across the viewport.
Anchor: the trade-off is the product.
Scores: originality 4, fit 4, feasibility 3, portability 3 → 14.

**Chosen: B, with C's threshold as the interactive section.** B is the only one whose
anchor is the product's actual material (three scripts) rather than its stationery, and
its spread survives into the app: thread on the left, verdict on the right — which is
what the Inbox already is.

## Concept card
```
Idea:        The page is a spread from the shop's khata: what arrived on the left,
             what the system decided on the right, always in the message's own script.
Metaphor:    a ruled account book kept by hand, read by a machine
Signature:   the gutter sort — messages land on the left, verdict stamps land on the
             right, tallies move at the foot, on one clock
Emotion:     "this is a working tool, and it is honest about what it does not know"
Motion verb: stamp and file — slips slide in, stamps land slightly askew, rules draw
Screenshot:  the open spread: three scripts stacked left, three lane stamps right
```

## Phase 2 — art direction

**Rule that decides everything: colour is status, interaction is inversion.**
Six class hues and three lane hues are the only colours on the site; every interactive
state is an inversion (ink fill, paper text) or a drawn rule, never a hue. That kills the
"single accent colour as the whole identity" default and keeps status legible.

Palette (roles; dark is the committed theme — the site ships dark only, no toggle):
| role | value | use |
|---|---|---|
| ground | `#141416` | page |
| ink | `#F2F0E9` | text, inverted buttons |
| muted | `#9D9BA5` | secondary text (AA) |
| line | `rgba(244,242,234,0.08)` | rules |
| mark | `#E7E06B` | the highlighter: the review lane, the marked word |
| lane-auto | `#7FD4A2` | handled |
| lane-scam | `#F0938A` | never auto |

Type: **Archivo** one family, two personalities (variable, width axis) — display 700 at
`font-stretch 112%`, tracking −0.035em, leading 0.92; text 400 at normal width, 16–17px,
measure ≤ 62ch. **IBM Plex Mono** for the machine layer (stamps, serials, figures).
**Noto Sans Bengali** carries Bangla at every size, including display, so a Bangla line is
never a fallback afterthought. No serif: the serif-on-dark was the first pass's tell.

Grid: 12 columns, 1360px max, one hard alignment line at col 1 and the gutter at col 7;
the spread is `1fr | 1px | 1fr` with the rule drawn, not implied. Section rhythm varies on
purpose: hero full-bleed split, problem statement, pipeline index list, lanes spread,
threshold full-bleed instrument, numbers data row, limits two letters, closing poster.

Shape: one radius scale, 2–8px, because a khata is cut, not moulded; cards are bounded by a
hairline, never a lift shadow. Depth appears only on the floating error panel.

Motion: one vocabulary. `cubic-bezier(.2,.7,.3,1)`, 140–650ms, large things slower.
Slips slide (translateY), stamps land (scale + rotate −2.5°), rules draw (scaleX). Idle:
the ledger keeps sorting. Reduced motion: static frame with every row in place.

**Genericness test.** "Would a generic model land here from the same prompt?" Its answer
would be the first pass: warm serif display, one amber accent, hairlines, mono labels. So
the serif, the amber identity and the eyebrow-above-every-heading were removed; the width
axis, the inverted interaction language, the spread and the highlighter replaced them.

## Composition plan
```
hero        ┌ dateline ────────────────────────────────┐
            │ headline (2 lines, 2nd on a marker band) │  ┌ spread ┐
            │ lede · CTAs · six class stamps           │  │ L | R  │
            └──────────────────────────────────────────┘  └────────┘
problem     statement (8 cols) + quote in the margin
pipeline    index list: 01…05, rule draws on hover, tag right
lanes       spread ×3: script specimen left, policy right
threshold   full-bleed instrument: τ, counts, rows re-routing live
numbers     four figures on one rule, read from eval.json
limits      two letters: provenance / known limits
closing     poster line + one key
```

## Non-negotiables carried from docs/06
One `<h1>`, `<main>`, skip link, visible focus, AA contrast on the dark palette, colour never
the only carrier, every metric read from `artifacts/eval.json`, 404 carries the concept,
and the data is always called a public corpus, never real seller messages.

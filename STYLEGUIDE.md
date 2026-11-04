# Chubascos · Style guide

> **Pluviógrafo**: a rain recorder that never stops. Every poem is a drop that
> leaves a puddle; every page is one layer of the same night's rain.

The GLSL hero and its H1 are the opening frame and **must not change**.
Everything else follows from them: night ink, the violet `#6d5dfc` rain, and
water that reacts when you touch it.

## 1. Tokens (`src/styles/_variables.scss`)

| Token | Value | Use |
| --- | --- | --- |
| `$ink` / `--ink` | `#06070a` | page background (the night) |
| `$ink-2`, `$ink-3` | `#0b0d12`, `#12151c` | surfaces floating on the water |
| `$paper` | `#ecebe4` | primary text (~16:1 on ink) |
| `$mist` | `#a9adb8` | secondary text (~8.6:1) |
| `$fog` | `#7c818d` | tertiary text, labels (≥ 4.6:1, never lower) |
| `$rain` | `#6d5dfc` | brand violet = the hero shader's accent. Fills and glows only, **never small text** (3.8:1) |
| `$rain-soft` | `#a59bff` | violet for text and links on ink (≥ 7:1) |
| `$puddle` | `#8fd3e8` | secondary accent: focus, active state, primary actions |
| `$ember` | `#ffb38a` | rare warm signal: live, recurring |
| `$line`, `$line-strong` | paper at 9% / 20% | hairlines |

Legacy tokens (`$font-serif`, `$font-sans`, `$black`, `$white`, `$accent`…)
stay as they are because the hero uses them.

## 2. Type

- **Display & poems:** Newsreader (optical sizes), via `--font-display`.
  Light (300) for headings, italic for voices (author, place, captions).
- **UI:** Geist, via `--font-ui`.
- **HUD / readouts:** Geist Mono, via `--font-hud`, uppercase, `0.14em`
  tracking, tabular numbers (`@include m.hud`).
- Fluid scale `$step--1 … $step-4`. Poems use `@include m.poem-body` and
  `$measure` (38rem).
- Verse keeps its line breaks (`white-space: pre-wrap` on `p`). Never flatten
  a poem into one line of prose.

## 3. Motifs (reuse them; don't invent near-copies)

| Motif | Where | What it means |
| --- | --- | --- |
| `DropSigil` | cards, avatars, page headers | The puddle a piece leaves behind: rings follow its lines and rhythm, and it is deterministic |
| `SectionHeader` | every section | index `01 / 04` · kicker · title · drifting hollow *echo* word |
| `Pluviograma` | home | the visual history: poems placed on a time axis |
| `RainGauge` | layout (≥ 768px) | scroll depth as rainfall; pure CSS scroll timeline |
| `FluidLayer` | layout | the water under every page |
| Rail + drops | legal pages, lists | a timeline of clauses or items |

## 4. Interaction → water (`src/lib/fluid/bus.ts`)

UI never talks to the GPU. It describes moments:

```ts
drop(x, y, { tone, power })   // a press, a keystroke, a tag chosen
dropAt(element, { tone })     // a moment that belongs to an element
plume(element, tone)          // save / follow / publish: something rises
force(fx, fy)                 // scroll drags the surface
```

Or declaratively: `data-drop="rain|puddle|paper|ember"` on any element ripples
on hover and on keyboard focus.

The renderer is WebGPU stable fluids (`gpuFluid.ts`), with a 2D ripple
fallback (`ripple2d.ts`). It sleeps after 7s of calm, pauses when the tab is
hidden, and **is off with `prefers-reduced-motion`**.

## 5. Motion

- Easing: `$ease-drop` (fast impact, long settle) for almost everything.
- Reveal with `@include m.settle` and parallax with `@include m.drift`. Both
  are CSS scroll-driven animations: no JS, and content is simply visible where
  they aren't supported.
- Ring draw-in on sigils; `ripple-out` for live indicators and spinners (no
  spinning wheels).

## 6. Components grammar

- Buttons: `@include m.ripple-button($tone)`, a hairline pill that fills from
  the pointer like water. 44px minimum target.
- Links in prose: `@include m.tide-link`, an underline that rises.
- Cards: a stretched link (`::after`) makes the whole card one tab stop.
  Inner links (tags, author) sit above it with `z-index: 1`.
- Surfaces: `@include m.surface`, opaque enough to read over the water without
  `backdrop-filter`.

## 7. Accessibility floor (non-negotiable)

- One focus language: 2px `--focus` (puddle) outline, everywhere.
- Text contrast ≥ 4.5:1 (use `$fog` or lighter; never `$rain` for text).
- Skip link → `#contenido`. Real `<button>`s for controls; `aria-expanded`
  and `aria-controls` on disclosures; WAI-ARIA tabs with arrow keys.
- Every animation and the fluid layer respect `prefers-reduced-motion`.
  Lenis falls back to native scroll.
- Decorative graphics (`DropSigil`, gauge, water) are `aria-hidden`.

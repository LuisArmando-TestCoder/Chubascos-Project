# dreams.md: post-task reflections

## 2026-11-04 · Pluviógrafo design overhaul + search performance

- **Measure before and after with the real data path.** Next.js runs server actions from one client one at a time, so a client-side `Promise.all` of four actions was really four sequential trips, plus two more for tags. Moving the fan-out to the server (`searchByTag`) and server-rendering the first results took `/buscar` from ~1.1s to ~0.23s with results visible, and from 6 round trips to 0. Check every client page that `Promise.all`s server actions; it is the same bug.
- **`in` queries cap at 30.** `getTagsByIds` silently dropped tags beyond the 30th. Chunking fixed it everywhere at once (the root-cause rule).
- **Emails were leaving the server.** `searchUsersByTag` sent full `User` docs (with email) to the browser. Search now maps users to `PublicUser`. Other client paths (saved items, profile) should get the same treatment.
- **Lint is not actually running.** `eslint.config.mjs` has no TypeScript parser, so every `.ts` file fails to parse. Switch to `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` (flat). That will surface ~20 existing `any`/hooks issues, mostly in `DashboardTemplate`.
- **Full-text search is an in-memory scan of a cached corpus.** It's right for hundreds of poems. Past ~1k, put Typesense or Algolia behind the same `searchPoems` contract.
- **WebGPU can't be screenshotted in headless sandboxes** (even a bare canvas renders white). The sim was verified in Node with Dawn (`webgpu` npm) + lavapipe instead. Keep that harness idea for future shader work.
- **Caching:** tag cloud 60s, tag searches 30s, poem corpus 120s (`unstable_cache`). New posts may take up to 2 min to become searchable. If that matters, call `revalidateTag('search')` from create/update/delete post.
- Next time, start from a design token pass *and* a contrast audit in the same step; most of the old UI's accessibility debt was text at 20–45% white.

## 2026-11-04 · Second pass after feedback

- **Ornament has to earn its place.** Kickers like "01 / 04 · Charcos frescos" above headings read as cheesy, and ring glyphs beside every poem competed with the verse. Rule: either it is real (shader water, a sigil that encodes identity) or it goes.
- **Draw water with water.** SVG rings that *imitate* drops lost to the hero's GLSL. The fix was to reuse the hero's own `addWave` physics. To stay under the browser's ~16 WebGL-context limit, one shared context renders every small field and blits into 2D canvases.
- **Sync SHA-256** (`utils/sha256.ts`) was needed because sigils render on the server and the client in the same pass. Web Crypto is async and Node crypto is server-only. It is verified against Node's `createHash`.
- **Scroll traps are the main risk of hover-wheel sliders.** The events row hands the wheel back to the page at its ends and uses `data-lenis-prevent-wheel` so Lenis doesn't fight it.
- **Canvases can't paint outside their element**, and `mask-image` clips to the border box too: the footer wordmark needed padding for its ascenders rather than a negative inset.

## 2026-11-04 · Tag taxonomy

- **Separate the axes before adding tags.** The old flat cloud mixed form, theme, mood, tradition and place. Seven roots, each answering one question, made the tree obvious and gave every legacy tag a single home (aliases absorb duplicates like `poesa`).
- **The tree lives in code, tags live in Firestore, joined by slug.** Versioned and reviewable, no schema change, and `seed-taxonomy.ts` is idempotent.
- **Branch search was a root-cause change:** `tagFilter()` lets every existing `search*ByTag` accept one id or a branch (≤ 30, `array-contains-any`), so load-more and expired events stay consistent without parallel APIs.
- Next: let authors propose new tags under a branch, moderated, instead of editing the file.

## 2026-11-04 · Water text everywhere

- **A one-off effect becomes a system the moment it's liked.** The footer used its own WebGL context; repeating it on every title would have hit the browser's ~16-context limit on the first list of poems. It now runs on a shared engine (`lib/water/waterText.ts`), the same pattern as `dropRenderer`. Next time, build shader effects shared from the start.
- **Match the browser's layout instead of re-implementing it:** glyphs are placed word by word from `Range.getClientRects()`, so wrapping, letter-spacing and text-transform match the DOM exactly.
- Search-hit titles lost their <mark> highlight to the effect; matches are still highlighted in the snippet.

## 2026-11-05 · Studio: events, poems, profile, books

- **Server actions are public endpoints.** Every write took `userId` from the browser, so anyone could edit anyone's work. `actions/data/guard.ts` now checks the session on every write. Grep for any new action that takes an identity argument and route it through `isActor`.
- **Dates without zones are a bug waiting for nightfall.** `new Date("YYYY-MM-DD")` is UTC midnight: Costa Rica saw events a day early and they expired at 18:00 the day before. The fix is to store a real instant plus the venue's IANA zone and do all calendar math on the venue's wall clock (`utils/eventTime.ts`, tested across DST). Legacy rows still need `src/scripts/migrate-event-times.ts` to be run once.
- **One source of truth per value.** The recurring picker had its own time and the stored first date ignored the pattern; the server now normalizes `day`/`hour` to the next real occurrence, and the picker takes the form's single time.
- **Owning state in each panel needs them to stay mounted.** Splitting the 950-line template into panels would have lost drafts on every tab switch; panels now mount on first visit and hide with `hidden`.
- **`transform` in a keyframe makes a containing block**, even with a final value of `none` under `fill-mode: both`. It trapped the PDF dialog inside the panel. Animate opacity only, and portal dialogs.
- **Visual QA caught what the types didn't:** a sticky preview sliding over the section below, and screen-reader text that widened the page on phones. Keep the throwaway preview route with mock data (never committed) for future studio work.
- **jsPDF's Times only has Windows-1252.** Emoji and CJK printed as mojibake. The PDF path now filters to printable glyphs; embedding a TTF (Newsreader) would be the real upgrade.
- Lint was not running; it now uses `eslint-config-next` (core-web-vitals + typescript) and is clean except one warning in the hero shader, which stays untouched by rule.
- Still open: user ids are emails, so `/u/<email>` URLs and `searchUsers` expose addresses. That needs a public handle or an opaque id.

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

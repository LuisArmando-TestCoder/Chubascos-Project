'use server';
/**
 * Search, built for one round trip.
 *
 * Next.js runs server actions from one client sequentially, so the old
 * page's `Promise.all` of four actions was really four trips in a row,
 * plus one more for tags. Everything below runs in parallel on the server,
 * is cached briefly, and returns exactly what the page renders.
 */
import { unstable_cache } from 'next/cache';
import { publicName } from '@/lib/handles';
import { attachHandles } from './handleStore';
import { db } from '@/firebase/admin';
import type { Post, Event, User, Tag, Book } from '@/types';
import { toData } from './common';
import { getTags, getTagsByIds } from './tags';
import { searchPostsByTag } from './posts';
import { searchBooksByTag } from './books';
import { searchEventsByTag } from './events';
import { searchUsersByTag } from './users';
import { TAXON_INDEX, subtreeSlugs } from '@/data/tagTaxonomy';

const TAG_ID = /^[A-Za-z0-9_-]{1,64}$/;
const RESULTS = 10;
const CORPUS_MAX = 1000;

export type PublicUser = Pick<User, 'id' | 'username' | 'handle' | 'bio' | 'tagIds' | 'contacts' | 'createdAt'> & { email: string };

export type TagSearchResult = {
  /** The tag plus its taxonomy descendants actually searched (≤ 30, most-used first). */
  scope: string[];
  posts: Post[]; postCursor: string | null;
  books: Book[]; bookCursor: string | null;
  events: Event[]; eventCursor: string | null;
  users: PublicUser[]; userCursor: string | null;
  tagMap: Record<string, Tag>;
};

export type PoemHit = Post & { authorName: string; snippet: string; score: number };

/** Never ship emails to the browser: derive the display name server-side. */
function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    username: publicName(u),
    handle: u.handle,
    bio: u.bio,
    tagIds: u.tagIds,
    contacts: u.contacts || [],
    createdAt: u.createdAt,
    email: '',
  };
}

const tagMapOf = (tags: Tag[]) => Object.fromEntries(tags.map((t) => [t.id, t]));

// ── Tag cloud: every tag (the taxonomy explorer needs empty branches too) ──
const cachedTagCloud = unstable_cache(
  async () => getTags(1000),
  ['search:tag-cloud:v2'],
  { revalidate: 60, tags: ['tags'] }
);

export async function getTagCloud(): Promise<Tag[]> {
  try {
    return await cachedTagCloud();
  } catch (error) {
    console.error('getTagCloud error:', error);
    return [];
  }
}

const usage = (t: Tag) => (t.usedByPosts || 0) + (t.usedByEvents || 0) + (t.usedByBooks || 0);

/**
 * A tag searches its whole branch: "Amor" also finds "Desamor" and
 * "Mutual pining". Firestore allows 30 values per query, so the branch is
 * ranked by usage and trimmed, the chosen tag always first.
 */
async function resolveScope(tagId: string): Promise<string[]> {
  const tags = await getTagCloud();
  const self = tags.find((t) => t.id === tagId);
  const canonical = self ? TAXON_INDEX.canonical.get(self.slug) : undefined;
  const node = canonical ? TAXON_INDEX.bySlug.get(canonical) : undefined;
  if (!node) return [tagId];
  const slugs = new Set(subtreeSlugs(node));
  const branch = tags.filter((t) => slugs.has(t.slug) && t.id !== tagId && usage(t) > 0).sort((a, b) => usage(b) - usage(a));
  return [tagId, ...branch.map((t) => t.id)].slice(0, 30);
}

// ── Tag search: four collections, one trip ───────────────────────────────────
async function runTagSearch(tagId: string): Promise<TagSearchResult> {
  const scope = await resolveScope(tagId);
  const [posts, books, events, users] = await Promise.all([
    searchPostsByTag(scope, RESULTS),
    searchBooksByTag(scope, RESULTS),
    searchEventsByTag(scope, RESULTS),
    searchUsersByTag(scope, RESULTS),
  ]);
  const ids = [
    tagId,
    ...posts.items.flatMap((p) => p.tagIds || []),
    ...books.items.flatMap((b) => b.tagIds || []),
    ...events.items.flatMap((e) => e.tagIds || []),
  ];
  const tags = await getTagsByIds(ids);
  return {
    scope,
    posts: posts.items, postCursor: posts.nextCursor,
    books: books.items, bookCursor: books.nextCursor,
    events: events.items, eventCursor: events.nextCursor,
    users: users.items.map(toPublicUser), userCursor: users.nextCursor,
    tagMap: tagMapOf(tags),
  };
}

const EMPTY: TagSearchResult = {
  scope: [],
  posts: [], postCursor: null, books: [], bookCursor: null,
  events: [], eventCursor: null, users: [], userCursor: null, tagMap: {},
};

export async function searchByTag(tagId: string): Promise<TagSearchResult> {
  if (typeof tagId !== 'string' || !TAG_ID.test(tagId)) return EMPTY;
  try {
    return await unstable_cache(() => runTagSearch(tagId), ['search:tag:v2', tagId], {
      revalidate: 30,
      tags: ['search', `tag:${tagId}`],
    })();
  } catch (error) {
    console.error('searchByTag error:', error);
    return EMPTY;
  }
}

/** Public-safe users for "load more" on the poets tab. */
export async function searchPublicUsersByTag(tagId: string | string[], cursor?: string) {
  const ids = (Array.isArray(tagId) ? tagId : [tagId]).filter((id) => typeof id === 'string' && TAG_ID.test(id)).slice(0, 30);
  if (ids.length === 0) return { items: [] as PublicUser[], nextCursor: null };
  const res = await searchUsersByTag(ids, RESULTS, cursor);
  return { items: res.items.map(toPublicUser), nextCursor: res.nextCursor };
}

// ── Full-text poem search ────────────────────────────────────────────────────
// Firestore has no full-text index. At Chubascos' scale (hundreds of poems)
// an in-memory scan of a cached, minimal corpus answers in ~1 ms after the
// first warm-up. Past ~1k poems, move this behind Typesense/Algolia; the
// `searchPoems` contract can stay the same.
type CorpusEntry = Post & { authorName: string; norm: { title: string; content: string; author: string } };

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const cachedCorpus = unstable_cache(
  async (): Promise<CorpusEntry[]> => {
    if (!db) return [];
    // No `where`/`orderBy`: a bare collection-group scan needs no composite index.
    const [postsSnap, usersSnap] = await Promise.all([
      db.collectionGroup('posts').limit(CORPUS_MAX).get(),
      db.collection('users').select('username', 'handle').limit(2000).get(),
    ]);
    const names = new Map<string, string>();
    usersSnap.docs.forEach((d) => {
      names.set(d.id, publicName(d.data() as { username?: string; handle?: string }));
    });
    return (postsSnap.docs.map(toData) as Post[])
      .filter((p) => p.isVisible !== false && typeof p.title === 'string' && typeof p.content === 'string')
      .map((p) => {
        const authorName = names.get(p.userId) || 'poeta';
        return {
          id: p.id, userId: p.userId, title: p.title, content: p.content, slug: p.slug,
          tagIds: p.tagIds || [], isVisible: true, isIndexed: p.isIndexed,
          createdAt: p.createdAt, updatedAt: p.updatedAt,
          authorName,
          norm: { title: normalize(p.title), content: normalize(p.content), author: normalize(authorName) },
        } as CorpusEntry;
      });
  },
  ['search:poem-corpus:v1'],
  { revalidate: 120, tags: ['search', 'posts'] }
);

function snippetFor(content: string, normContent: string, token: string): string {
  const at = normContent.indexOf(token);
  const lines = content.split('\n');
  if (at < 0) return lines.find((l) => l.trim())?.trim() || '';
  // Normalisation keeps string length for Spanish text, so offsets line up.
  let acc = 0;
  for (const line of lines) {
    if (at <= acc + line.length) return line.trim() || lines.find((l) => l.trim())?.trim() || '';
    acc += line.length + 1;
  }
  return lines[0]?.trim() || '';
}

const secondsOf = (ts: unknown) => (ts && typeof ts === 'object' && 'seconds' in ts ? (ts as { seconds: number }).seconds : 0);

export async function searchPoems(rawQuery: string): Promise<{ hits: PoemHit[]; tagMap: Record<string, Tag>; total: number }> {
  const query = typeof rawQuery === 'string' ? normalize(rawQuery.trim()).slice(0, 80) : '';
  if (query.length < 2) return { hits: [], tagMap: {}, total: 0 };
  const tokens = query.split(/\s+/).filter((t) => t.length > 0).slice(0, 8);

  try {
    const corpus = await cachedCorpus();
    const scored: PoemHit[] = [];
    for (const p of corpus) {
      let score = 0;
      let ok = true;
      for (const t of tokens) {
        const inTitle = p.norm.title.includes(t);
        const inAuthor = p.norm.author.includes(t);
        const inContent = p.norm.content.includes(t);
        if (!inTitle && !inAuthor && !inContent) { ok = false; break; }
        score += (inTitle ? 6 : 0) + (inAuthor ? 3 : 0) + (inContent ? 1 : 0);
        if (p.norm.title.startsWith(t)) score += 2;
      }
      if (!ok) continue;
      if (tokens.length > 1 && (p.norm.title.includes(query) || p.norm.content.includes(query))) score += 5;
      const { norm, ...post } = p;
      const firstToken = tokens.find((t) => norm.content.includes(t)) || tokens[0];
      scored.push({ ...post, score, snippet: snippetFor(p.content, norm.content, firstToken) });
    }
    scored.sort((a, b) => b.score - a.score || secondsOf(b.updatedAt) - secondsOf(a.updatedAt));
    const hits = await attachHandles(scored.slice(0, 40));
    const tags = await getTagsByIds(hits.flatMap((h) => h.tagIds || []));
    return { hits, tagMap: tagMapOf(tags), total: scored.length };
  } catch (error) {
    console.error('searchPoems error:', error);
    return { hits: [], tagMap: {}, total: 0 };
  }
}

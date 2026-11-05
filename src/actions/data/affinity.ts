'use server';
/**
 * Kindred voices, computed once for everyone and cached.
 *
 * Three light scans (only the fields the profiles need) feed
 * `computeAffinities`; at Chubascos' scale the whole map takes a few ms and
 * is reused by every profile until the cache expires or posts change.
 */
import { unstable_cache } from 'next/cache';
import { db } from '@/firebase/admin';
import { computeAffinities, type AuthorInput, type Kindred } from '@/lib/affinity';
import { getTagCloud } from './search';

export type { Kindred } from '@/lib/affinity';

const SCAN_MAX = 2000;
const USER_ID = /^[^/]{1,128}$/;

type Lite = { userId?: string; tagIds?: string[]; isVisible?: boolean };

const cachedAffinities = unstable_cache(
  async (): Promise<Record<string, Kindred[]>> => {
    if (!db) return {};
    const [posts, books, users, tags] = await Promise.all([
      db.collectionGroup('posts').select('userId', 'tagIds', 'isVisible').limit(SCAN_MAX).get(),
      db.collectionGroup('books').select('userId', 'tagIds', 'isVisible').limit(SCAN_MAX).get(),
      db.collection('users').select('username', 'email', 'tagIds').limit(SCAN_MAX).get(),
      getTagCloud(),
    ]);

    const authors = new Map<string, AuthorInput>();
    users.docs.forEach((d) => {
      const u = d.data() as { username?: string; email?: string; tagIds?: string[] };
      authors.set(d.id, {
        id: d.id,
        name: u.username || (u.email ? u.email.split('@')[0] : 'poeta'),
        works: [],
        selfTags: Array.isArray(u.tagIds) ? u.tagIds : [],
      });
    });
    for (const doc of [...posts.docs, ...books.docs]) {
      const w = doc.data() as Lite;
      // Works live under users/{id}/…; older docs may lack the userId field.
      const uid = w.userId || doc.ref.parent.parent?.id;
      if (w.isVisible === false || !uid || !Array.isArray(w.tagIds)) continue;
      authors.get(uid)?.works.push(w.tagIds);
    }
    return computeAffinities([...authors.values()], tags);
  },
  ['affinity:v1'],
  { revalidate: 600, tags: ['posts', 'books', 'affinity'] }
);

/** The voices that write most like this author, strongest first (≤ 6). */
export async function getKindredVoices(userId: string): Promise<Kindred[]> {
  if (typeof userId !== 'string' || !USER_ID.test(userId)) return [];
  try {
    return (await cachedAffinities())[userId] ?? [];
  } catch (error) {
    console.error('getKindredVoices error:', error);
    return [];
  }
}

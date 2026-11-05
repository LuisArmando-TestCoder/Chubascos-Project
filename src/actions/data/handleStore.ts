// Server-only handle storage (no 'use server': these helpers must not be
// callable from the browser). Uniqueness lives in `handles/{handle}` →
// `{ userId }`, claimed inside a transaction, so two poets can never share one.

import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { unstable_cache } from 'next/cache';
import { db } from '@/firebase/admin';
import { handleBase, isValidHandle } from '@/lib/handles';

const HANDLES = 'handles';
export const HANDLES_CACHE_TAG = 'handles';

type ClaimResult = { ok: true; handle: string } | { ok: false; reason: 'taken' | 'missing-user' };

/**
 * Give `userId` the handle `wanted`, atomically. Releases the previous handle
 * only when `replace` is true (an intentional change); otherwise a user who
 * already has a handle keeps it (seeding is idempotent under races).
 */
async function claim(userId: string, wanted: string, replace: boolean): Promise<ClaimResult> {
  if (!db) return { ok: false, reason: 'missing-user' };
  const handleRef = db.collection(HANDLES).doc(wanted);
  const userRef = db.collection('users').doc(userId);
  return db.runTransaction(async (t) => {
    const [handleDoc, userDoc] = await Promise.all([t.get(handleRef), t.get(userRef)]);
    if (!userDoc.exists) return { ok: false, reason: 'missing-user' } as const;
    const current = userDoc.data()?.handle as string | undefined;
    if (!replace && isValidHandle(current)) return { ok: true, handle: current } as const;
    if (handleDoc.exists && handleDoc.data()?.userId !== userId) return { ok: false, reason: 'taken' } as const;

    t.set(handleRef, { userId, claimedAt: admin.firestore.FieldValue.serverTimestamp() });
    t.update(userRef, { handle: wanted });
    if (replace && current && current !== wanted) t.delete(db!.collection(HANDLES).doc(current));
    return { ok: true, handle: wanted } as const;
  });
}

/** Candidates for a seed: `luna`, `luna-2` … `luna-9`, then random tails. */
function* candidates(base: string): Generator<string> {
  if (base) {
    yield base;
    for (let n = 2; n <= 9; n++) yield `${base.slice(0, 27)}-${n}`;
  }
  const stem = (base || 'poeta').slice(0, 24);
  for (let i = 0; i < 8; i++) yield `${stem}-${crypto.randomBytes(3).toString('hex').slice(0, 5)}`;
}

/** The poet's handle, seeding one from their name the first time. */
export async function ensureHandle(userId: string): Promise<string | null> {
  if (!db || !userId) return null;
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data() ?? {};
  if (isValidHandle(data.handle)) return data.handle;

  for (const candidate of candidates(handleBase(data.username))) {
    if (!isValidHandle(candidate)) continue;
    try {
      const r = await claim(userId, candidate, false);
      if (r.ok) return r.handle;
      if (r.reason === 'missing-user') return null;
    } catch (error) {
      console.error('ensureHandle claim failed:', error);
    }
  }
  return null;
}

/** Intentional change from the studio. The old handle is released. */
export async function changeHandleFor(userId: string, wanted: string): Promise<{ ok: true; handle: string } | { ok: false; error: string }> {
  if (!isValidHandle(wanted)) return { ok: false, error: 'Dirección no válida.' };
  try {
    const r = await claim(userId, wanted, true);
    if (r.ok) return r;
    return { ok: false, error: r.reason === 'taken' ? 'Esa dirección ya tiene dueño.' : 'No encontramos tu perfil.' };
  } catch (error) {
    console.error('changeHandleFor failed:', error);
    return { ok: false, error: 'No se pudo cambiar la dirección.' };
  }
}

export async function handleOwner(handle: string): Promise<string | null> {
  if (!db || !isValidHandle(handle)) return null;
  const doc = await db.collection(HANDLES).doc(handle).get();
  const owner = doc.data()?.userId;
  return typeof owner === 'string' ? owner : null;
}

export async function isHandleFree(handle: string, forUserId?: string): Promise<boolean> {
  const owner = await handleOwner(handle);
  return owner === null || owner === forUserId;
}

/** userId → handle for every poet with one. Cached; refreshed on change. */
const cachedHandleMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    if (!db) return {};
    const snap = await db.collection('users').select('handle').limit(5000).get();
    const map: Record<string, string> = {};
    for (const d of snap.docs) {
      const h = d.data().handle;
      if (isValidHandle(h)) map[d.id] = h;
    }
    return map;
  },
  ['handle-map:v1'],
  { revalidate: 60, tags: [HANDLES_CACHE_TAG] },
);

/** Handles for these user ids; seeds any that are missing (one-time backfill). */
export async function handlesFor(userIds: Iterable<string>): Promise<Map<string, string>> {
  const ids = [...new Set([...userIds].filter((id) => typeof id === 'string' && id.length > 0))];
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  let map: Record<string, string> = {};
  try { map = await cachedHandleMap(); } catch (error) { console.error('handle map failed:', error); }
  const missing: string[] = [];
  for (const id of ids) {
    if (map[id]) out.set(id, map[id]);
    else missing.push(id);
  }
  // Poets the cache hasn't seen yet (new, or never seeded): resolve directly.
  await Promise.all(missing.slice(0, 50).map(async (id) => {
    const h = await ensureHandle(id).catch(() => null);
    if (h) out.set(id, h);
  }));
  return out;
}

/**
 * Put `authorHandle` on items so the browser can build links without the
 * owner's email. `key` is the field holding the owner id.
 */
export async function attachHandles<T extends object>(items: T[], key: 'userId' | 'ownerUserId' = 'userId'): Promise<(T & { authorHandle?: string })[]> {
  if (!items.length) return items;
  const ids = items.map((i) => (i as Record<string, unknown>)[key]).filter((v): v is string => typeof v === 'string');
  const handles = await handlesFor(ids);
  return items.map((item) => {
    const owner = (item as Record<string, unknown>)[key];
    const handle = typeof owner === 'string' ? handles.get(owner) : undefined;
    return handle ? { ...item, authorHandle: handle } : item;
  });
}

export async function attachHandle<T extends object>(item: T | null, key: 'userId' | 'ownerUserId' = 'userId'): Promise<(T & { authorHandle?: string }) | null> {
  if (!item) return item;
  return (await attachHandles([item], key))[0];
}

export interface ResolvedOwner {
  userId: string;
  handle: string | null;
  /** True when the URL segment is not the canonical handle (e.g. an email). */
  shouldRedirect: boolean;
}

/**
 * A `/u/<segment>` may hold a handle (canonical) or, from links shared
 * before handles existed, an email. Both resolve; emails get redirected.
 */
export async function resolveOwnerSegment(rawSegment: string): Promise<ResolvedOwner | null> {
  if (!db) return null;
  let segment = rawSegment;
  try { segment = decodeURIComponent(rawSegment); } catch { /* keep raw */ }
  segment = segment.trim();
  if (!segment) return null;

  if (segment.includes('@')) {
    const email = segment.toLowerCase();
    let userId: string | null = null;
    const byId = await db.collection('users').doc(email).get();
    if (byId.exists) userId = byId.id;
    else {
      const byField = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!byField.empty) userId = byField.docs[0].id;
    }
    if (!userId) return null;
    const handle = await ensureHandle(userId);
    return { userId, handle, shouldRedirect: Boolean(handle) };
  }

  const lower = segment.toLowerCase();
  const userId = await handleOwner(lower);
  if (!userId) return null;
  return { userId, handle: lower, shouldRedirect: lower !== segment };
}

/** Same for user records: fill `handle` where the document has none yet. */
export async function attachUserHandles<T extends { id: string; handle?: string }>(users: T[]): Promise<T[]> {
  const missing = users.filter((u) => !isValidHandle(u.handle)).map((u) => u.id);
  if (!missing.length) return users;
  const handles = await handlesFor(missing);
  return users.map((u) => (isValidHandle(u.handle) ? u : { ...u, handle: handles.get(u.id) }));
}

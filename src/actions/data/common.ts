import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { sendNotificationEmail } from '@/utils/sendEmail';
import crypto from 'crypto';
import { generateSlug } from '@/utils/generateSlug';

export const LIVE_FEED_MAX = 20;
export const PAGE_SIZE = 10;

// Firestore data is untyped at this boundary; callers cast to their domain type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serialize = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(serialize);
  if (obj instanceof admin.firestore.Timestamp) {
    return { seconds: obj.seconds, nanoseconds: obj.nanoseconds };
  }
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    serialized[key] = serialize(value);
  }
  return serialized;
};

export const toData = (doc: QueryDocumentSnapshot) => {
  const data = { id: doc.id, ...doc.data() };
  return serialize(data);
};

export async function evictLiveFeed(): Promise<void> {
  if (!db) return;
  const snapshot = await db.collection('live_feed')
    .orderBy('updatedAt', 'desc')
    .limit(LIVE_FEED_MAX + 1)
    .get();
  
  if (snapshot.docs.length <= LIVE_FEED_MAX) return;
  
  const toEvict = snapshot.docs.slice(LIVE_FEED_MAX);
  if (toEvict.length === 0) return;
  
  const batch = db.batch();
  toEvict.forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));
  await batch.commit();
}

export async function notifyFollowers(userId: string, itemData: Record<string, unknown>, type: 'post' | 'event' | 'book'): Promise<void> {
  if (!db) return;
  
  // Get author profile for the username
  const authorDoc = await db.collection('users').doc(userId).get();
  const authorName = authorDoc.exists ? (authorDoc.data()?.username || 'Un poeta') : 'Un poeta';

  const followersSnapshot = await db.collection('users').doc(userId).collection('followers').get();
  const followerEmails: string[] = followersSnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.id);
  
  // Batch processing
  const chunkSize = 50;
  for (let i = 0; i < followerEmails.length; i += chunkSize) {
    const chunk = followerEmails.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map((email) => sendNotificationEmail(email, userId, authorName, { ...itemData, type }))
    );
  }
}

export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content || '').digest('hex').substring(0, 16);
}

/**
 * One tag, or a whole branch of the taxonomy. Firestore caps
 * `array-contains-any` at 30 values; callers pass the most-used first.
 */
export function tagFilter(tagId: string | string[]): [admin.firestore.WhereFilterOp, string | string[]] {
  if (Array.isArray(tagId)) {
    const ids = [...new Set(tagId.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 30);
    return ids.length === 1 ? ['array-contains', ids[0]] : ['array-contains-any', ids];
  }
  return ['array-contains', tagId];
}

// ── Write helpers shared by posts, events and books ─────────────────────────

type TagCounter = 'usedByPosts' | 'usedByEvents' | 'usedByBooks';

/**
 * Keep only ids that point at real tag documents. A stale or forged id would
 * otherwise make `batch.update` throw NOT_FOUND and sink the whole save.
 */
export async function existingTagIds(ids: readonly string[] | undefined): Promise<string[]> {
  if (!db || !ids || ids.length === 0) return [];
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))];
  if (unique.length === 0) return [];
  const docs = await db.getAll(...unique.map((id) => db!.collection('tags').doc(id)));
  return docs.filter((d) => d.exists).map((d) => d.id);
}

/** Move tag usage counters from `prev` to `next` inside an existing batch. */
export function applyTagDelta(
  batch: admin.firestore.WriteBatch,
  prev: readonly string[] = [],
  next: readonly string[] = [],
  field: TagCounter,
): void {
  if (!db) return;
  const before = new Set(prev);
  const after = new Set(next);
  for (const id of after) {
    if (!before.has(id)) batch.update(db.collection('tags').doc(id), { [field]: admin.firestore.FieldValue.increment(1) });
  }
  for (const id of before) {
    if (!after.has(id)) batch.update(db.collection('tags').doc(id), { [field]: admin.firestore.FieldValue.increment(-1) });
  }
}

/**
 * A slug that is unique inside one collection (a poet's poems or books).
 * Short or symbol-only titles ("Yo", "¿?") fall back to `<prefix>-…` so they
 * always satisfy the 3-char URL rule instead of failing validation.
 */
export async function uniqueSlug(
  collection: admin.firestore.CollectionReference,
  wanted: string,
  prefix: string,
  excludeId?: string,
): Promise<string> {
  let base = generateSlug(wanted).slice(0, 90).replace(/-+$/g, '');
  if (base.length < 3) base = base ? `${prefix}-${base}` : prefix;

  for (let n = 1; n <= 25; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const snap = await collection.where('slug', '==', candidate).limit(2).get();
    if (snap.docs.every((d) => d.id === excludeId)) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

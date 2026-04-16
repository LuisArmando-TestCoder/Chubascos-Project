import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { sendNotificationEmail } from '@/utils/sendEmail';
import crypto from 'crypto';

export const LIVE_FEED_MAX = 20;
export const PAGE_SIZE = 10;

export const serialize = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(serialize);
  if (obj instanceof admin.firestore.Timestamp) {
    return { seconds: obj.seconds, nanoseconds: obj.nanoseconds };
  }
  const serialized: any = {};
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

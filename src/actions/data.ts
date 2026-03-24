import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { sendNotificationEmail } from '@/utils/sendEmail';
import { PostSchema } from '@/utils/validation';

const LIVE_FEED_MAX = 10;

export async function getLiveFeed(limitNum: number = 10) {
  if (!db) return [];
  const snapshot = await db.collection('live_feed')
    .where('isVisible', '==', true)
    .where('isIndexed', '==', true)
    .orderBy('updatedAt', 'desc')
    .limit(limitNum)
    .get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function getEvents(limitNum: number = 10) {
  if (!db) return [];
  const snapshot = await db.collection('events')
    .orderBy('day', 'asc')
    .where('day', '>=', admin.firestore.Timestamp.now())
    .limit(limitNum)
    .get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function getUsers(limitNum: number = 10) {
  if (!db) return [];
  const snapshot = await db.collection('users')
    .orderBy('createdAt', 'desc')
    .limit(limitNum)
    .get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function createPost(userId: string, data: any) {
  if (!db) return { success: false, error: 'Database not initialized' };
  const validated = PostSchema.parse(data);
  const postRef = db.collection('users').doc(userId).collection('posts').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const postData = {
    ...validated,
    id: postRef.id,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(postRef, postData);

  if (postData.isIndexed && postData.isVisible) {
    const liveFeedRef = db.collection('live_feed').doc(postRef.id);
    batch.set(liveFeedRef, postData);
  }

  await batch.commit();

  if (postData.isIndexed && postData.isVisible) {
    // Non-blocking: evict old entries and notify followers
    evictLiveFeed().catch(err => console.error('Live feed eviction error:', err));
    notifyFollowers(userId, postData).catch(err => console.error('Notification error:', err));
  }

  return { success: true, id: postRef.id };
}

async function evictLiveFeed(): Promise<void> {
  if (!db) return;
  const snapshot = await db.collection('live_feed')
    .orderBy('updatedAt', 'desc')
    .offset(LIVE_FEED_MAX)
    .get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
  await batch.commit();
}

async function notifyFollowers(userId: string, postData: any): Promise<void> {
  if (!db) return;
  const followersSnapshot = await db.collection('users').doc(userId).collection('followers').get();
  const followerEmails: string[] = followersSnapshot.docs.map((doc: any) => doc.id as string);
  // Parallel — never sequential
  await Promise.allSettled(
    followerEmails.map((email: string) => sendNotificationEmail(email, userId, postData))
  );
}

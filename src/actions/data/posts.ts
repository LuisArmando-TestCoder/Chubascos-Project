'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { PostSchema } from '@/utils/validation';
import { generateSlug } from '@/utils/generateSlug';
import type { Post, SerializedTimestamp } from '@/types';
import { toData, serialize, PAGE_SIZE, evictLiveFeed, notifyFollowers, generateContentHash } from './common';
import { getUserProfileByEmail } from './users';

export async function getLiveFeed(limitNum: number = PAGE_SIZE, cursor?: string) {
  if (!db) return { items: [], nextCursor: null };
  
  let query = db.collection('live_feed')
    .orderBy('updatedAt', 'desc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('live_feed').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(toData);
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function getUserPosts(
  userId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string,
  tagFilter?: string
): Promise<{ items: Post[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };
  
  let query: admin.firestore.Query = db
    .collection('users').doc(userId).collection('posts')
    .where('isVisible', '==', true)
    .orderBy('updatedAt', 'desc')
    .limit(limitNum);

  if (tagFilter) query = query.where('tagIds', 'array-contains', tagFilter);

  if (cursor) {
    const cursorDoc = await db.collection('users').doc(userId).collection('posts').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(toData) as Post[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function getUserAllPosts(userId: string): Promise<Post[]> {
  if (!db) return [];
  const snapshot = await db
    .collection('users').doc(userId).collection('posts')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  return snapshot.docs.map(toData) as Post[];
}

export async function getPost(userId: string, slugOrId: string): Promise<Post | null> {
  if (!db) return null;
  let resolvedUserId = userId;

  if (userId.includes('@')) {
    const user = await getUserProfileByEmail(userId);
    if (user) resolvedUserId = user.id;
  }

  const bySlug = await db.collection('users').doc(resolvedUserId).collection('posts')
    .where('slug', '==', slugOrId)
    .limit(1)
    .get();

  if (!bySlug.empty) {
    const doc = bySlug.docs[0];
    return { id: doc.id, ...serialize(doc.data()) } as Post;
  }

  const byId = await db.collection('users').doc(resolvedUserId).collection('posts').doc(slugOrId).get();
  if (byId.exists) return { id: byId.id, ...serialize(byId.data()) } as Post;

  return null;
}

export async function getPreviousPost(userId: string, currentUpdatedAt: admin.firestore.Timestamp | SerializedTimestamp | null): Promise<Post | null> {
  if (!db || !currentUpdatedAt) return null;
  const ts = currentUpdatedAt instanceof admin.firestore.Timestamp 
    ? currentUpdatedAt 
    : new admin.firestore.Timestamp(currentUpdatedAt.seconds, currentUpdatedAt.nanoseconds);

  const snapshot = await db.collection('users').doc(userId).collection('posts')
    .where('updatedAt', '<', ts)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return toData(snapshot.docs[0]) as Post;
}

export async function getNextPost(userId: string, currentUpdatedAt: admin.firestore.Timestamp | SerializedTimestamp | null): Promise<Post | null> {
  if (!db || !currentUpdatedAt) return null;
  const ts = currentUpdatedAt instanceof admin.firestore.Timestamp 
    ? currentUpdatedAt 
    : new admin.firestore.Timestamp(currentUpdatedAt.seconds, currentUpdatedAt.nanoseconds);

  const snapshot = await db.collection('users').doc(userId).collection('posts')
    .where('updatedAt', '>', ts)
    .orderBy('updatedAt', 'asc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return toData(snapshot.docs[0]) as Post;
}

export async function searchPostsByTag(
  tagId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Post[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };

  try {
    let q: admin.firestore.Query = db.collectionGroup('posts')
      .where('tagIds', 'array-contains', tagId)
      .where('isVisible', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(limitNum);

    if (cursor) {
      const cursorSeconds = parseInt(cursor);
      if (!isNaN(cursorSeconds)) {
        q = q.startAfter(admin.firestore.Timestamp.fromMillis(cursorSeconds * 1000));
      }
    }

    const snapshot = await q.get();
    const items = snapshot.docs.map(toData) as Post[];
    const lastUpdatedAt = items[items.length - 1]?.updatedAt as { seconds: number } | undefined;
    const nextCursor = items.length === limitNum && lastUpdatedAt
      ? String(lastUpdatedAt.seconds)
      : null;

    return { items, nextCursor };
  } catch (error: any) {
    return { items: [], nextCursor: null };
  }
}

export async function createPost(userId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  
  try {
    const validated = PostSchema.parse(data);
    const postRef = db.collection('users').doc(userId).collection('posts').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const slug = validated.slug || generateSlug(validated.title);

    const postData = {
      ...validated,
      slug,
      id: postRef.id,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(postRef, postData);

    for (const tagId of validated.tagIds || []) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, { usedByPosts: admin.firestore.FieldValue.increment(1) });
    }

    if (validated.shaderId) {
      const shaderRef = db.collection('shaders').doc(validated.shaderId);
      batch.update(shaderRef, { usedBy: admin.firestore.FieldValue.increment(1) });
    }

    if (postData.isIndexed && postData.isVisible) {
      const liveFeedRef = db.collection('live_feed').doc(postRef.id);
      batch.set(liveFeedRef, postData);
      
      const contentHash = generateContentHash(postData.content);
      const hashRef = db.collection('users').doc(userId).collection('notified_hashes').doc(contentHash);
      const hashDoc = await hashRef.get();

      if (!hashDoc.exists) {
        batch.set(hashRef, { createdAt: now });
        await batch.commit();
        console.log(`[Notificación] Enviando correos para el post ${postRef.id}`);
        evictLiveFeed().catch(console.error);
        notifyFollowers(userId, postData, 'post').catch(console.error);
        return { success: true, id: postRef.id, slug };
      } else {
        console.log(`[Anti-Spam] Contenido duplicado detectado. Saltando notificación para ${postRef.id}.`);
      }
    }

    await batch.commit();
    return { success: true, id: postRef.id, slug };
  } catch (error: unknown) {
    console.error('createPost error:', error);
    return { success: false, error: 'No se pudo guardar el poema.' };
  }
}

export async function updatePost(userId: string, postId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const validated = PostSchema.partial().parse(data);
    const postRef = db.collection('users').doc(userId).collection('posts').doc(postId);
    const existing = await postRef.get();
    if (!existing.exists) return { success: false, error: 'Poema no encontrado.' };

    const now = admin.firestore.FieldValue.serverTimestamp();
    const slug = validated.slug || (validated.title ? generateSlug(validated.title) : existing.data()?.slug);

    const updateData: any = { slug, updatedAt: now };
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined) updateData[key] = value;
    }
    
    const batch = db.batch();
    batch.update(postRef, updateData);

    const merged = { ...existing.data(), ...updateData };
    const isPublic = merged.isIndexed && merged.isVisible;
    const liveFeedRef = db.collection('live_feed').doc(postId);

    if (isPublic) {
      batch.set(liveFeedRef, { ...merged }, { merge: true });
    } else {
      batch.delete(liveFeedRef);
    }

    await batch.commit();

    if (isPublic) {
      evictLiveFeed().catch(console.error);
      // NOTE: We don't notify followers on updates
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('updatePost error:', error);
    return { success: false, error: 'No se pudo actualizar el poema.' };
  }
}

export async function deletePost(userId: string, postId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const postRef = db.collection('users').doc(userId).collection('posts').doc(postId);
    const existing = await postRef.get();
    if (!existing.exists) return { success: false, error: 'Poema no encontrado.' };

    const postData = existing.data();
    const batch = db.batch();

    batch.delete(postRef);
    batch.delete(db.collection('live_feed').doc(postId));

    for (const tagId of postData?.tagIds || []) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, { usedByPosts: admin.firestore.FieldValue.increment(-1) });
    }

    if (postData?.shaderId) {
      const shaderRef = db.collection('shaders').doc(postData.shaderId);
      batch.update(shaderRef, { usedBy: admin.firestore.FieldValue.increment(-1) });
    }

    await batch.commit();
    return { success: true };
  } catch (error: unknown) {
    console.error('deletePost error:', error);
    return { success: false, error: 'No se pudo eliminar el poema.' };
  }
}

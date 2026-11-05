'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { BookSchema, firstIssue } from '@/utils/validation';
import type { Book } from '@/types';
import { toData, serialize, PAGE_SIZE, notifyFollowers, generateContentHash, tagFilter, existingTagIds, applyTagDelta, uniqueSlug } from './common';
import { isActor, FORBIDDEN } from './guard';
import { getUserProfileByEmail } from './users';

export async function getUserBooks(userId: string): Promise<Book[]> {
  if (!db) return [];
  const snapshot = await db
    .collection('users').doc(userId).collection('books')
    .where('isVisible', '==', true)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  return snapshot.docs.map(toData) as Book[];
}

export async function getUserAllBooks(userId: string): Promise<Book[]> {
  if (!db) return [];
  const snapshot = await db
    .collection('users').doc(userId).collection('books')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  return snapshot.docs.map(toData) as Book[];
}

export async function getBook(userId: string, slugOrId: string): Promise<Book | null> {
  if (!db) return null;

  let resolvedUserId = userId;

  if (userId.includes('@')) {
    const user = await getUserProfileByEmail(userId);
    if (user) resolvedUserId = user.id;
  }

  const bySlug = await db.collection('users').doc(resolvedUserId).collection('books')
    .where('slug', '==', slugOrId)
    .limit(1)
    .get();

  if (!bySlug.empty) {
    const doc = bySlug.docs[0];
    return { id: doc.id, ...serialize(doc.data()) } as Book;
  }

  const byId = await db.collection('users').doc(resolvedUserId).collection('books').doc(slugOrId).get();
  if (byId.exists) return { id: byId.id, ...serialize(byId.data()) } as Book;

  return null;
}

export async function searchBooksByTag(
  tagId: string | string[],
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Book[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };

  try {
    let q: admin.firestore.Query = db.collectionGroup('books')
      .where('tagIds', ...tagFilter(tagId))
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
    const items = snapshot.docs.map(toData) as Book[];
    const lastUpdatedAt = items[items.length - 1]?.updatedAt as { seconds: number } | undefined;
    const nextCursor = items.length === limitNum && lastUpdatedAt
      ? String(lastUpdatedAt.seconds)
      : null;

    return { items, nextCursor };
  } catch (error: unknown) {
    console.error('tag search failed:', error);
    return { items: [], nextCursor: null };
  }
}

export async function createBook(userId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    const parsed = BookSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error, 'Revisa el libro.') };
    const validated = parsed.data;

    const booksCol = db.collection('users').doc(userId).collection('books');
    const bookRef = booksCol.doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const [slug, tagIds] = await Promise.all([
      uniqueSlug(booksCol, validated.slug || validated.title, 'libro'),
      existingTagIds(validated.tagIds),
    ]);

    const bookData = {
      ...validated,
      tagIds,
      slug,
      id: bookRef.id,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(bookRef, bookData);
    applyTagDelta(batch, [], tagIds, 'usedByBooks');

    if (bookData.isVisible) {
      const contentHash = generateContentHash(bookData.title + (bookData.content || ''));
      const hashRef = db.collection('users').doc(userId).collection('notified_hashes').doc(contentHash);
      const hashDoc = await hashRef.get();

      if (!hashDoc.exists) {
        batch.set(hashRef, { createdAt: now });
        await batch.commit();
        notifyFollowers(userId, bookData, 'book').catch(console.error);
        return { success: true, id: bookRef.id, slug };
      }
    }

    await batch.commit();
    return { success: true, id: bookRef.id, slug };
  } catch (error: unknown) {
    console.error('createBook error:', error);
    return { success: false, error: 'No se pudo guardar el libro.' };
  }
}

export async function updateBook(userId: string, bookId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    const parsed = BookSchema.partial().safeParse(data);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error, 'Revisa el libro.') };
    const validated = parsed.data;

    const booksCol = db.collection('users').doc(userId).collection('books');
    const bookRef = booksCol.doc(bookId);
    const existing = await bookRef.get();
    if (!existing.exists) return { success: false, error: 'Libro no encontrado.' };
    const prev = existing.data()!;

    const slug = validated.slug && validated.slug !== prev.slug
      ? await uniqueSlug(booksCol, validated.slug, 'libro', bookId)
      : prev.slug;

    const updateData: Record<string, unknown> = { slug, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined && key !== 'slug' && key !== 'tagIds') updateData[key] = value;
    }

    const batch = db.batch();
    if (validated.tagIds) {
      const tagIds = await existingTagIds(validated.tagIds);
      updateData.tagIds = tagIds;
      applyTagDelta(batch, await existingTagIds(prev.tagIds), tagIds, 'usedByBooks');
    }
    batch.update(bookRef, updateData);
    await batch.commit();
    return { success: true, slug };
  } catch (error: unknown) {
    console.error('updateBook error:', error);
    return { success: false, error: 'No se pudo actualizar el libro.' };
  }
}

export async function deleteBook(userId: string, bookId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    const bookRef = db.collection('users').doc(userId).collection('books').doc(bookId);
    const existing = await bookRef.get();
    if (!existing.exists) return { success: false, error: 'Libro no encontrado.' };

    const batch = db.batch();
    batch.delete(bookRef);
    applyTagDelta(batch, await existingTagIds(existing.data()?.tagIds), [], 'usedByBooks');
    await batch.commit();
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteBook error:', error);
    return { success: false, error: 'No se pudo eliminar el libro.' };
  }
}

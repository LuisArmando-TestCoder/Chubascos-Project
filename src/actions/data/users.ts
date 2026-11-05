'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import type { User } from '@/types';
import { toData, serialize, PAGE_SIZE, tagFilter, existingTagIds } from './common';
import { isActor, FORBIDDEN } from './guard';
import { attachHandles, attachUserHandles } from './handleStore';
import { ProfileUpdateSchema, USERNAME_RE, firstIssue } from '@/utils/validation';

export async function getUsers(limitNum: number = PAGE_SIZE, cursor?: string) {
  if (!db) return { items: [], nextCursor: null };
  let query = db.collection('users')
    .orderBy('createdAt', 'desc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('users').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = await attachUserHandles(snapshot.docs.map(toData) as User[]);
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function getUserProfile(userId: string): Promise<User | null> {
  if (!db) return null;
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...serialize(doc.data()) } as User;
}

export async function getUserProfileByEmail(email: string): Promise<User | null> {
  if (!db) return null;
  const snap = await db.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...serialize(doc.data()) } as User;
}

export async function searchUsers(
  query: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: User[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };

  const lower = query.toLowerCase();
  const end = lower.replace(/.$/, (c) => String.fromCharCode(c.charCodeAt(0) + 1));

  let q: admin.firestore.Query = db.collection('users')
    .where('usernameLower', '>=', lower)
    .where('usernameLower', '<', end)
    .orderBy('usernameLower')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('users').doc(cursor).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  const snapshot = await q.get();
  const items = await attachUserHandles(snapshot.docs.map(toData) as User[]);
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function searchUsersByTag(
  tagId: string | string[],
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: User[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };

  let q: admin.firestore.Query = db.collection('users')
    .where('tagIds', ...tagFilter(tagId))
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('users').doc(cursor).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  const snapshot = await q.get();
  const items = await attachUserHandles(snapshot.docs.map(toData) as User[]);
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

async function usernameTakenBy(usernameLower: string): Promise<string | null> {
  if (!db) return null;
  const snap = await db.collection('users').where('usernameLower', '==', usernameLower).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/** Live check for the studio: is this name valid and free for me? */
export async function checkUsernameAvailable(
  userId: string,
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  const name = String(username ?? '').trim();
  if (name.length < 3) return { available: false, reason: 'Al menos 3 caracteres.' };
  if (name.length > 32) return { available: false, reason: 'Hasta 32 caracteres.' };
  if (!USERNAME_RE.test(name)) return { available: false, reason: 'Sin espacios ni símbolos (solo . _ -).' };
  if (!db || !(await isActor(userId))) return { available: true };
  const owner = await usernameTakenBy(name.toLowerCase());
  return owner && owner !== userId ? { available: false, reason: 'Ese nombre ya tiene dueño.' } : { available: true };
}

export async function updateUserProfile(userId: string, data: {
  username?: string;
  bio?: string;
  contacts?: { label: string; url: string }[];
  tagIds?: string[];
}) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    // An empty name means "keep none": skip it rather than failing the save.
    const input = { ...data, username: data?.username?.trim() ? data.username : undefined };
    const parsed = ProfileUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error, 'Revisa tu perfil.') };
    const valid = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (valid.username !== undefined) {
      const lower = valid.username.toLowerCase();
      const owner = await usernameTakenBy(lower);
      if (owner && owner !== userId) return { success: false, error: 'Ese nombre de usuario ya está en uso.' };
      updateData.username = valid.username;
      updateData.usernameLower = lower;
    }
    if (valid.bio !== undefined) updateData.bio = valid.bio.trim();
    if (valid.contacts !== undefined) updateData.contacts = valid.contacts;
    if (valid.tagIds !== undefined) updateData.tagIds = await existingTagIds(valid.tagIds);

    await db.collection('users').doc(userId).update(updateData);
    return { success: true };
  } catch (error: unknown) {
    console.error('updateUserProfile error:', error);
    return { success: false, error: 'No se pudo actualizar el perfil.' };
  }
}

export async function getSavedItems(
  userIds: string[],
  type: 'posts' | 'users' | 'events'
) {
  if (!db || !userIds || userIds.length === 0) return { items: [] };
  
  const items: Record<string, unknown>[] = [];
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    let chunkSnapshot;
    if (type === 'posts') {
      chunkSnapshot = await db.collection('live_feed').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
    } else if (type === 'users') {
      chunkSnapshot = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
    } else if (type === 'events') {
      chunkSnapshot = await db.collection('events').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
    }
    
    if (chunkSnapshot) {
      const rows = chunkSnapshot.docs.map(toData) as Record<string, unknown>[];
      if (type === 'users') items.push(...await attachUserHandles(rows as { id: string; handle?: string }[]));
      else items.push(...await attachHandles(rows, type === 'events' ? 'ownerUserId' : 'userId'));
    }
  }

  return { items };
}

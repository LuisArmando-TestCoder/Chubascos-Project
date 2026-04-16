'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import type { User } from '@/types';
import { toData, serialize, PAGE_SIZE } from './common';

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
  const items = snapshot.docs.map(toData);
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
  const items = snapshot.docs.map(toData) as User[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function searchUsersByTag(
  tagId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: User[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };

  let q: admin.firestore.Query = db.collection('users')
    .where('tagIds', 'array-contains', tagId)
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('users').doc(cursor).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  const snapshot = await q.get();
  const items = snapshot.docs.map(toData) as User[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function updateUserProfile(userId: string, data: {
  username?: string;
  bio?: string;
  contacts?: { label: string; url: string }[];
  tagIds?: string[];
}) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const updateData: Record<string, unknown> = {};
    if (data.username !== undefined) {
      if (data.username.length < 3 || data.username.length > 32) {
        return { success: false, error: 'Nombre de usuario debe tener entre 3 y 32 caracteres.' };
      }
      updateData.username = data.username;
      updateData.usernameLower = data.username.toLowerCase();
    }
    if (data.bio !== undefined) {
      if (data.bio.length > 500) return { success: false, error: 'Biografía muy larga (máx 500).' };
      updateData.bio = data.bio;
    }
    if (data.contacts !== undefined) {
      if (data.contacts.length > 5) return { success: false, error: 'Máximo 5 contactos.' };
      updateData.contacts = data.contacts;
    }
    if (data.tagIds !== undefined) {
      if (data.tagIds.length > 10) return { success: false, error: 'Máximo 10 etiquetas en el perfil.' };
      updateData.tagIds = data.tagIds;
    }

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
  
  const items: any[] = [];
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
      items.push(...chunkSnapshot.docs.map(toData));
    }
  }

  return { items };
}

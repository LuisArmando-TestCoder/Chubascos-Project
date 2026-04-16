'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import type { Tag } from '@/types';
import { toData } from './common';

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  if (!db || !ids || ids.length === 0) return [];
  const snapshot = await db.collection('tags')
    .where(admin.firestore.FieldPath.documentId(), 'in', ids.slice(0, 30))
    .get();
  return snapshot.docs.map(toData) as Tag[];
}

export async function getTags(limitNum: number = 50, prefix?: string): Promise<Tag[]> {
  if (!db) return [];
  let query: admin.firestore.Query = db.collection('tags').orderBy('slug').limit(limitNum);
  if (prefix) {
    const end = prefix.replace(/.$/, (c) => String.fromCharCode(c.charCodeAt(0) + 1));
    query = query.where('slug', '>=', prefix).where('slug', '<', end);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(toData) as Tag[];
}

export async function upsertTag(value: string): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const { generateSlug } = await import('@/utils/generateSlug');
    const slug = generateSlug(value).toLowerCase();
    const existing = await db.collection('tags').where('slug', '==', slug).limit(1).get();

    if (!existing.empty) {
      return { success: true, id: existing.docs[0].id };
    }

    const tagRef = db.collection('tags').doc();
    await tagRef.set({ value, slug, usedByPosts: 0, usedByEvents: 0, usedByBooks: 0 });
    return { success: true, id: tagRef.id };
  } catch (error: unknown) {
    console.error('upsertTag error:', error);
    return { success: false, error: 'No se pudo crear la etiqueta.' };
  }
}

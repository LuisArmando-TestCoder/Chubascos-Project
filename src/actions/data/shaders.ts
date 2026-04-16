'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { ShaderSchema } from '@/utils/validation';
import type { Shader } from '@/types';
import { toData, serialize, PAGE_SIZE } from './common';

export async function getShader(shaderId: string): Promise<Shader | null> {
  if (!db) return null;
  const doc = await db.collection('shaders').doc(shaderId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...serialize(doc.data()) } as Shader;
}

export async function getPublicShaders(limitNum: number = PAGE_SIZE, cursor?: string): Promise<{ items: Shader[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };
  let query: admin.firestore.Query = db.collection('shaders')
    .where('isPublic', '==', true)
    .where('isDeleted', '==', false)
    .orderBy('usedBy', 'desc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('shaders').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(toData) as Shader[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function createShader(userId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const validated = ShaderSchema.parse(data);
    const shaderRef = db.collection('shaders').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await shaderRef.set({
      ...validated,
      id: shaderRef.id,
      ownerUserId: userId,
      usedBy: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id: shaderRef.id };
  } catch (error: unknown) {
    console.error('createShader error:', error);
    return { success: false, error: 'No se pudo crear el shader.' };
  }
}

export async function updateShader(userId: string, shaderId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const shaderRef = db.collection('shaders').doc(shaderId);
    const existing = await shaderRef.get();
    if (!existing.exists) return { success: false, error: 'Shader no encontrado.' };
    if (existing.data()?.ownerUserId !== userId) return { success: false, error: 'Sin permiso.' };

    const validated = ShaderSchema.partial().parse(data);
    await shaderRef.update({ ...validated, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
  } catch (error: unknown) {
    console.error('updateShader error:', error);
    return { success: false, error: 'No se pudo actualizar el shader.' };
  }
}

export async function softDeleteShader(userId: string, shaderId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const shaderRef = db.collection('shaders').doc(shaderId);
    const existing = await shaderRef.get();
    if (!existing.exists) return { success: false, error: 'Shader no encontrado.' };
    if (existing.data()?.ownerUserId !== userId) return { success: false, error: 'Sin permiso.' };

    await shaderRef.update({ isDeleted: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
  } catch (error: unknown) {
    console.error('softDeleteShader error:', error);
    return { success: false, error: 'No se pudo eliminar el shader.' };
  }
}

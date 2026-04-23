'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { EventSchema } from '@/utils/validation';
import type { Event } from '@/types';
import { toData, serialize, PAGE_SIZE, notifyFollowers, generateContentHash } from './common';
import { sendNotificationEmail } from '@/utils/sendEmail';
import { getNextOccurrenceFromCron } from '@/utils/cronUtils';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

/**
 * Refresh expired recurring events by updating their `day` field
 * to the next computed occurrence. This ensures they appear in
 * "upcoming" queries automatically.
 */
async function refreshExpiredRecurringEvents(): Promise<void> {
  if (!db) return;
  try {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collection('events')
      .where('isRecurring', '==', true)
      .where('day', '<', now)
      .limit(50)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    let updates = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.cronExpression) continue;

      const nextDate = getNextOccurrenceFromCron(data.cronExpression);
      if (!nextDate) continue;

      const nextTimestamp = admin.firestore.Timestamp.fromDate(nextDate);
      const nextHour = `${String(nextDate.getHours()).padStart(2, '0')}:${String(nextDate.getMinutes()).padStart(2, '0')}`;

      batch.update(doc.ref, {
        day: nextTimestamp,
        hour: nextHour,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updates++;
    }

    if (updates > 0) await batch.commit();
  } catch (error) {
    console.error('refreshExpiredRecurringEvents error:', error);
  }
}

export async function getEvents(limitNum: number = PAGE_SIZE, cursor?: string) {
  if (!db) return { items: [], nextCursor: null };

  // Auto-renew expired recurring events before querying
  await refreshExpiredRecurringEvents();

  const now = admin.firestore.Timestamp.now();
  let query = db.collection('events')
    .where('day', '>=', now)
    .orderBy('day', 'asc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('events').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(toData);
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function getEvent(eventId: string): Promise<Event | null> {
  if (!db) return null;
  const doc = await db.collection('events').doc(eventId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...serialize(doc.data()) } as Event;
}

export async function searchEventsByTag(
  tagId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Event[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };
  
  // Auto-renew expired recurring events before querying
  await refreshExpiredRecurringEvents();

  try {
    const now = admin.firestore.Timestamp.now();
    let q: admin.firestore.Query = db.collection('events')
      .where('tagIds', 'array-contains', tagId)
      .where('day', '>=', now)
      .orderBy('day', 'asc')
      .limit(limitNum);

    if (cursor) {
      const cursorDoc = await db.collection('events').doc(cursor).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    const items = snapshot.docs.map(toData) as Event[];
    const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { items, nextCursor };
  } catch (error: any) {
    return { items: [], nextCursor: null };
  }
}

export async function searchExpiredEventsByTag(
  tagId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Event[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };
  
  try {
    const now = admin.firestore.Timestamp.now();
    let q: admin.firestore.Query = db.collection('events')
      .where('tagIds', 'array-contains', tagId)
      .where('day', '<', now)
      .orderBy('day', 'desc')
      .limit(limitNum);

    if (cursor) {
      const cursorDoc = await db.collection('events').doc(cursor).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    const items = snapshot.docs.map(toData) as Event[];
    const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { items, nextCursor };
  } catch (error: any) {
    return { items: [], nextCursor: null };
  }
}

export async function getUserEvents(userId: string): Promise<Event[]> {
  if (!db) return [];
  // Auto-renew expired recurring events before querying
  await refreshExpiredRecurringEvents();
  const snapshot = await db.collection('events')
    .where('ownerUserId', '==', userId)
    .limit(50)
    .get();
  const events = snapshot.docs.map(toData) as Event[];
  const nowSec = Date.now() / 1000;
  const upcoming = events
    .filter((e) => ((e.day as any)?.seconds ?? 0) >= nowSec)
    .sort((a, b) => ((a.day as any)?.seconds ?? 0) - ((b.day as any)?.seconds ?? 0));
  const expired = events
    .filter((e) => ((e.day as any)?.seconds ?? 0) < nowSec)
    .sort((a, b) => ((b.day as any)?.seconds ?? 0) - ((a.day as any)?.seconds ?? 0));
  return [...upcoming, ...expired];
}

export async function createEvent(userId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const validated = EventSchema.parse(data);
    const eventRef = db.collection('events').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const eventData = {
      ...validated,
      id: eventRef.id,
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(eventRef, eventData);

    for (const tagId of validated.tagIds || []) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, { usedByEvents: admin.firestore.FieldValue.increment(1) });
    }

    const contentHash = generateContentHash(eventData.title + (eventData.description || ''));
    const hashRef = db.collection('users').doc(userId).collection('notified_hashes').doc(contentHash);
    const hashDoc = await hashRef.get();

    if (!hashDoc.exists) {
      batch.set(hashRef, { createdAt: now });
      await batch.commit();
      notifyFollowers(userId, eventData, 'event').catch(console.error);
      return { success: true, id: eventRef.id };
    }

    await batch.commit();
    return { success: true, id: eventRef.id };
  } catch (error: unknown) {
    console.error('createEvent error:', error);
    return { success: false, error: 'No se pudo crear el evento.' };
  }
}

export async function joinEvent(eventId: string, userEmail: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) return { success: false, error: 'Evento no encontrado.' };
    const eventData = eventDoc.data();

    const requestRef = eventRef.collection('participants').doc(userEmail);
    await requestRef.set({
      email: userEmail,
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (eventData?.ownerUserId) {
      const poetDoc = await db.collection('users').doc(eventData.ownerUserId).get();
      const poetData = poetDoc.data();
      if (poetData?.email) {
        await sendNotificationEmail(poetData.email, userEmail, userEmail, { 
          title: eventData.title,
          type: 'event_subscription',
          eventId: eventId
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Join event error:', error);
    return { success: false, error: 'No se pudo solicitar unirse al evento.' };
  }
}

export async function acceptParticipant(eventId: string, ownerUserId: string, userEmail: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists || eventDoc.data()?.ownerUserId !== ownerUserId) {
      return { success: false, error: 'Sin permiso.' };
    }

    await eventRef.collection('participants').doc(userEmail).update({
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Accept participant error:', error);
    return { success: false, error: 'No se pudo aceptar al participante.' };
  }
}

export async function getEventParticipants(eventId: string) {
  if (!db) return [];
  const snapshot = await db.collection('events').doc(eventId).collection('participants')
    .where('status', '==', 'accepted')
    .get();
  return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data());
}

export async function updateEvent(userId: string, eventId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const eventRef = db.collection('events').doc(eventId);
    const existing = await eventRef.get();
    if (!existing.exists) return { success: false, error: 'Evento no encontrado.' };
    if (existing.data()?.ownerUserId !== userId) return { success: false, error: 'Sin permiso.' };

    const validated = EventSchema.partial().parse(data);
    
    const cleanData: any = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined) cleanData[key] = value;
    }
    
    await eventRef.update({ ...cleanData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
  } catch (error: unknown) {
    console.error('updateEvent error:', error);
    if (error instanceof Error) {
      return { success: false, error: 'No se pudo actualizar el evento: ' + error.message };
    }
    return { success: false, error: 'No se pudo actualizar el evento.' };
  }
}

export async function deleteEvent(userId: string, eventId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };

  try {
    const eventRef = db.collection('events').doc(eventId);
    const existing = await eventRef.get();
    if (!existing.exists) return { success: false, error: 'Evento no encontrado.' };
    if (existing.data()?.ownerUserId !== userId) return { success: false, error: 'Sin permiso.' };

    const eventData = existing.data();
    const batch = db.batch();
    batch.delete(eventRef);
    for (const tagId of eventData?.tagIds || []) {
      batch.update(db.collection('tags').doc(tagId), { usedByEvents: admin.firestore.FieldValue.increment(-1) });
    }
    await batch.commit();
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteEvent error:', error);
    return { success: false, error: 'No se pudo eliminar el evento.' };
  }
}

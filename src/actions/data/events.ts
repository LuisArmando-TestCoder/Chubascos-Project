'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import { EventSchema, EventBaseSchema, firstIssue } from '@/utils/validation';
import type { Event } from '@/types';
import { toData, serialize, PAGE_SIZE, notifyFollowers, generateContentHash, tagFilter, existingTagIds, applyTagDelta } from './common';
import { isActor, isActorEmail, FORBIDDEN } from './guard';
import {
  DEFAULT_EVENT_TIME_ZONE, EVENT_GRACE_MS, eventStartMs, isEventPast, isValidTimeZone, wallClockIn, wallTimeString,
} from '@/utils/eventTime';
import { sendNotificationEmail } from '@/utils/sendEmail';
import { getNextOccurrenceFromCron } from '@/utils/cronUtils';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

/**
 * Refresh expired recurring events by moving `day` to the next occurrence,
 * computed on the venue's wall clock. Throttled per server instance: it runs
 * on read paths and should not cost a query on every request.
 */
let lastRecurringRefresh = 0;
const RECURRING_REFRESH_EVERY_MS = 60_000;

async function refreshExpiredRecurringEvents(): Promise<void> {
  if (!db) return;
  const nowMs = Date.now();
  if (nowMs - lastRecurringRefresh < RECURRING_REFRESH_EVERY_MS) return;
  lastRecurringRefresh = nowMs;
  try {
    const cutoff = admin.firestore.Timestamp.fromMillis(nowMs - EVENT_GRACE_MS);
    const snapshot = await db.collection('events')
      .where('day', '<', cutoff)
      .orderBy('day', 'desc')
      .limit(100)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    let updates = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.isRecurring || !data.cronExpression) continue;

      // Legacy recurring events have no zone; their hours were typed in Costa Rica.
      const timeZone = isValidTimeZone(data.timeZone) ? data.timeZone : DEFAULT_EVENT_TIME_ZONE;
      const nextDate = getNextOccurrenceFromCron(data.cronExpression, new Date(nowMs - EVENT_GRACE_MS), timeZone);
      if (!nextDate) continue;

      batch.update(doc.ref, {
        day: admin.firestore.Timestamp.fromDate(nextDate),
        hour: wallTimeString(wallClockIn(nextDate, timeZone)),
        timeZone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updates++;
    }

    if (updates > 0) await batch.commit();
  } catch (error) {
    console.error('refreshExpiredRecurringEvents error:', error);
  }
}

/** Upcoming = started less than EVENT_GRACE_MS ago (still happening) or later. */
function upcomingCutoff() {
  return admin.firestore.Timestamp.fromMillis(Date.now() - EVENT_GRACE_MS);
}

type ScheduleInput = { day: Date; hour: string; isRecurring?: boolean; cronExpression?: string; timeZone?: string };

/**
 * One source of truth for when an event happens. A recurring event's `day`
 * and `hour` are always its next real occurrence on or after the chosen
 * start date, so the card, the cron and the calendar never disagree.
 */
function normalizeSchedule(input: ScheduleInput): { day: Date; hour: string; timeZone: string; isRecurring: boolean; cronExpression?: string } {
  const timeZone = isValidTimeZone(input.timeZone) ? input.timeZone : DEFAULT_EVENT_TIME_ZONE;
  if (input.isRecurring && input.cronExpression) {
    const from = new Date(Math.max(input.day.getTime() - 60_000, Date.now() - EVENT_GRACE_MS));
    const next = getNextOccurrenceFromCron(input.cronExpression, from, timeZone);
    if (next) {
      return { day: next, hour: wallTimeString(wallClockIn(next, timeZone)), timeZone, isRecurring: true, cronExpression: input.cronExpression };
    }
  }
  return { day: input.day, hour: input.hour, timeZone, isRecurring: false };
}

export async function getEvents(limitNum: number = PAGE_SIZE, cursor?: string) {
  if (!db) return { items: [], nextCursor: null };

  // Auto-renew expired recurring events before querying
  await refreshExpiredRecurringEvents();

  let query = db.collection('events')
    .where('day', '>=', upcomingCutoff())
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
  tagId: string | string[],
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Event[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };
  
  // Auto-renew expired recurring events before querying
  await refreshExpiredRecurringEvents();

  try {
    let q: admin.firestore.Query = db.collection('events')
      .where('tagIds', ...tagFilter(tagId))
      .where('day', '>=', upcomingCutoff())
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
  } catch (error: unknown) {
    console.error('tag search failed:', error);
    return { items: [], nextCursor: null };
  }
}

export async function searchExpiredEventsByTag(
  tagId: string | string[],
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Event[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };
  
  try {
    let q: admin.firestore.Query = db.collection('events')
      .where('tagIds', ...tagFilter(tagId))
      .where('day', '<', upcomingCutoff())
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
  } catch (error: unknown) {
    console.error('tag search failed:', error);
    return { items: [], nextCursor: null };
  }
}

const MAX_EVENTS_PER_POET = 1000;

export async function getUserEvents(userId: string): Promise<Event[]> {
  if (!db) return [];
  // Auto-renew expired recurring events before querying
  await refreshExpiredRecurringEvents();
  // No orderBy here (it would need a composite index), so take every event
  // the poet owns and sort below. A `.limit()` without an order returned an
  // arbitrary slice by document id: new events could silently go missing.
  const snapshot = await db.collection('events')
    .where('ownerUserId', '==', userId)
    .limit(MAX_EVENTS_PER_POET)
    .get();
  const events = snapshot.docs.map(toData) as Event[];
  const now = Date.now();
  const upcoming = events
    .filter((e) => !isEventPast(e, now))
    .sort((a, b) => eventStartMs(a) - eventStartMs(b));
  const expired = events
    .filter((e) => isEventPast(e, now))
    .sort((a, b) => eventStartMs(b) - eventStartMs(a));
  return [...upcoming, ...expired];
}

export async function createEvent(userId: string, data: unknown) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    const parsed = EventSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error, 'Revisa los datos del evento.') };
    const validated = parsed.data;

    const schedule = normalizeSchedule(validated);
    if (!schedule.isRecurring && schedule.day.getTime() + EVENT_GRACE_MS < Date.now()) {
      return { success: false, error: 'Esa fecha ya pasó. Elige un día próximo.' };
    }

    const tagIds = await existingTagIds(validated.tagIds);
    const eventRef = db.collection('events').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const { cronExpression, price, ...rest } = { ...validated, ...schedule };
    const eventData = {
      ...rest,
      ...(typeof price === 'number' ? { price } : {}),
      ...(schedule.isRecurring ? { cronExpression } : {}),
      tagIds,
      id: eventRef.id,
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(eventRef, eventData);
    applyTagDelta(batch, [], tagIds, 'usedByEvents');

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
  if (!(await isActorEmail(userEmail))) return FORBIDDEN;
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
  if (!(await isActor(ownerUserId))) return FORBIDDEN;
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
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    const eventRef = db.collection('events').doc(eventId);
    const existing = await eventRef.get();
    if (!existing.exists) return { success: false, error: 'Evento no encontrado.' };
    const prev = existing.data()!;
    if (prev.ownerUserId !== userId) return FORBIDDEN;

    const parsed = EventBaseSchema.partial().safeParse(data);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error, 'Revisa los datos del evento.') };
    const validated = parsed.data;

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value === null) cleanData[key] = admin.firestore.FieldValue.delete();
      else if (value !== undefined) cleanData[key] = value;
    }

    // Any schedule change is re-normalized against the stored values.
    const touchesSchedule = ['day', 'hour', 'isRecurring', 'cronExpression', 'timeZone'].some((k) => k in cleanData);
    if (touchesSchedule) {
      const isRecurring = validated.isRecurring ?? Boolean(prev.isRecurring);
      const cronExpression = validated.cronExpression ?? (validated.isRecurring === false ? undefined : prev.cronExpression);
      if (isRecurring && !cronExpression) {
        return { success: false, error: 'Un evento recurrente necesita una programación.' };
      }
      const schedule = normalizeSchedule({
        day: validated.day ?? (prev.day as admin.firestore.Timestamp).toDate(),
        hour: validated.hour ?? prev.hour,
        isRecurring,
        cronExpression,
        timeZone: validated.timeZone ?? prev.timeZone,
      });
      Object.assign(cleanData, schedule);
      cleanData.cronExpression = schedule.isRecurring ? schedule.cronExpression : admin.firestore.FieldValue.delete();
    }

    const batch = db.batch();
    if (validated.tagIds) {
      const nextTags = await existingTagIds(validated.tagIds);
      cleanData.tagIds = nextTags;
      applyTagDelta(batch, await existingTagIds(prev.tagIds), nextTags, 'usedByEvents');
    }
    batch.update(eventRef, { ...cleanData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();
    return { success: true };
  } catch (error: unknown) {
    console.error('updateEvent error:', error);
    return { success: false, error: 'No se pudo actualizar el evento.' };
  }
}

export async function deleteEvent(userId: string, eventId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  if (!(await isActor(userId))) return FORBIDDEN;

  try {
    const eventRef = db.collection('events').doc(eventId);
    const existing = await eventRef.get();
    if (!existing.exists) return { success: false, error: 'Evento no encontrado.' };
    if (existing.data()?.ownerUserId !== userId) return { success: false, error: 'Sin permiso.' };

    const eventData = existing.data();
    const batch = db.batch();
    batch.delete(eventRef);
    applyTagDelta(batch, await existingTagIds(eventData?.tagIds), [], 'usedByEvents');
    await batch.commit();
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteEvent error:', error);
    return { success: false, error: 'No se pudo eliminar el evento.' };
  }
}

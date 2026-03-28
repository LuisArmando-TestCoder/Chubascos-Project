'use server';

import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { sendNotificationEmail } from '@/utils/sendEmail';
import { PostSchema, EventSchema, ShaderSchema } from '@/utils/validation';
import { generateSlug } from '@/utils/generateSlug';
import type { Post, Event, Shader, Tag, User, SerializedTimestamp } from '@/types';

const serialize = (obj: any): any => {
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

const toData = (doc: QueryDocumentSnapshot) => {
  const data = { id: doc.id, ...doc.data() };
  return serialize(data);
};

const LIVE_FEED_MAX = 10;
const PAGE_SIZE = 10;

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getLiveFeed(limitNum: number = PAGE_SIZE, cursor?: string) {
  console.log(`🌊 [Feed] Cargando feed de poemas | Límite: ${limitNum} | Cursor: ${cursor || 'Inicio'}`);
  if (!db) {
    console.error('❌ [Feed] Base de datos no disponible.');
    return { items: [], nextCursor: null };
  }
  
  // live_feed only contains indexed+visible posts by design (enforced at write time)
  let query = db.collection('live_feed')
    .orderBy('updatedAt', 'desc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('live_feed').doc(cursor).get();
    if (cursorDoc.exists) {
      console.log(`🔍 [Feed] Paginación usando cursor: ${cursor}`);
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(toData);
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  console.log(`✅ [Feed] Se cargaron ${items.length} poemas exitosamente.`);
  return { items, nextCursor };
}

export async function getEvents(limitNum: number = PAGE_SIZE, cursor?: string) {
  if (!db) return { items: [], nextCursor: null };
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

  if (tagFilter) {
    query = query.where('tagIds', 'array-contains', tagFilter);
  }

  if (cursor) {
    const cursorDoc = await db.collection('users').doc(userId).collection('posts').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(toData) as Post[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function getPost(userId: string, slugOrId: string): Promise<Post | null> {
  if (!db) return null;

  // Try slug first
  const bySlug = await db.collection('users').doc(userId).collection('posts')
    .where('slug', '==', slugOrId)
    .limit(1)
    .get();

  if (!bySlug.empty) {
    const doc = bySlug.docs[0];
    return { id: doc.id, ...serialize(doc.data()) } as Post;
  }

  // Fallback to direct ID
  const byId = await db.collection('users').doc(userId).collection('posts').doc(slugOrId).get();
  if (byId.exists) return { id: byId.id, ...serialize(byId.data()) } as Post;

  return null;
}

export async function getEvent(eventId: string): Promise<Event | null> {
  if (!db) return null;
  const doc = await db.collection('events').doc(eventId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...serialize(doc.data()) } as Event;
}

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  if (!db || !ids || ids.length === 0) return [];
  // Firestore 'in' queries limited to 10-30 items
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

export async function getShader(shaderId: string): Promise<Shader | null> {
  if (!db) return null;
  const doc = await db.collection('shaders').doc(shaderId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Shader;
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

// ─── SEARCH ───────────────────────────────────────────────────────────────────

export async function searchUsers(
  query: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: User[]; nextCursor: string | null }> {
  if (!db) return { items: [], nextCursor: null };

  // First check if query is a tag ID (from tag cloud)
  const tagSnapshot = await db.collection('tags').doc(query).get();
  if (tagSnapshot.exists) {
    // If it's a tag, search users who have posts with this tag
    // Since users don't have direct tagIds yet, we'll search users collection by username as fallback
    // Or if we want to truly find "poets" by tag, we'd need a different schema.
    // For now, let's treat the query as a potential username.
  }

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
  console.log(`🔎 👤 [Búsqueda: Poetas] Buscando poetas con tag: "${tagId}"`);
  if (!db) {
    console.error('❌ [Búsqueda: Poetas] Base de datos no disponible.');
    return { items: [], nextCursor: null };
  }

  // This is a complex query because tagIds are on posts, not users.
  // We'll search for posts with the tag, and get unique user IDs.
  const postsSnapshot = await db.collection('live_feed')
    .where('tagIds', 'array-contains', tagId)
    .limit(limitNum * 2) // Fetch more to account for duplicate users
    .get();

  const userIds = Array.from(new Set(postsSnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data().userId)));

  if (userIds.length === 0) {
    console.log(`⚠️  [Búsqueda: Poetas] Ningún poeta ha escrito sobre el tag "${tagId}".`);
    return { items: [], nextCursor: null };
  }

  console.log(`👥 [Búsqueda: Poetas] Identificados ${userIds.length} poetas únicos para el tag "${tagId}". Solicitando perfiles...`);

  // Fetch user profiles for these IDs
  // Firestore 'in' queries are limited to 10-30 items
  const usersSnapshot = await db.collection('users')
    .where(admin.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 10))
    .get();

  const items = usersSnapshot.docs.map(toData) as User[];
  console.log(`🌟 [Búsqueda: Poetas] Perfiles recuperados con éxito: ${items.length}`);
  return { items, nextCursor: null };
}

export async function searchPostsByTag(
  tagId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Post[]; nextCursor: string | null }> {
  console.log(`🔎 📝 [Búsqueda: Poemas] Buscando poemas con tag: "${tagId}" | Límite: ${limitNum} | Cursor: ${cursor || 'Inicio'}`);
  if (!db) {
    console.error('❌ [Búsqueda: Poemas] Base de datos no disponible.');
    return { items: [], nextCursor: null };
  }
  
  // live_feed only contains indexed+visible posts
  let q: admin.firestore.Query = db.collection('live_feed')
    .where('tagIds', 'array-contains', tagId)
    .orderBy('updatedAt', 'desc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('live_feed').doc(cursor).get();
    if (cursorDoc.exists) {
      console.log(`⏭️  [Búsqueda: Poemas] Paginando a partir del cursor: ${cursor}`);
      q = q.startAfter(cursorDoc);
    }
  }

  const snapshot = await q.get();
  const items = snapshot.docs.map(toData) as Post[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  console.log(`✨ [Búsqueda: Poemas] Encontrados ${items.length} poemas bajo el tag "${tagId}".`);
  return { items, nextCursor };
}

export async function searchEventsByTag(
  tagId: string,
  limitNum: number = PAGE_SIZE,
  cursor?: string
): Promise<{ items: Event[]; nextCursor: string | null }> {
  console.log(`🔎 📅 [Búsqueda: Eventos] Buscando eventos con tag: "${tagId}" | Límite: ${limitNum}`);
  if (!db) {
    console.error('❌ [Búsqueda: Eventos] Base de datos no disponible.');
    return { items: [], nextCursor: null };
  }
  
  let q: admin.firestore.Query = db.collection('events')
    .where('tagIds', 'array-contains', tagId)
    .orderBy('day', 'asc')
    .limit(limitNum);

  if (cursor) {
    const cursorDoc = await db.collection('events').doc(cursor).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  const snapshot = await q.get();
  const items = snapshot.docs.map(toData) as Event[];
  const nextCursor = snapshot.docs.length === limitNum ? snapshot.docs[snapshot.docs.length - 1].id : null;
  console.log(`🎉 [Búsqueda: Eventos] Encontrados ${items.length} eventos bajo el tag "${tagId}".`);
  return { items, nextCursor };
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

export async function getSavedItems(
  userIds: string[],
  type: 'posts' | 'users' | 'events'
) {
  if (!db || !userIds || userIds.length === 0) return { items: [] };
  
  const items: any[] = [];
  // Firestore 'in' query has a limit of 10-30 IDs
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

// ─── WRITE ────────────────────────────────────────────────────────────────────

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

    // Increment usedBy for each tag
    for (const tagId of validated.tagIds || []) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, { usedByPosts: admin.firestore.FieldValue.increment(1) });
    }

    // Increment usedBy for shader if linked
    if (validated.shaderId) {
      const shaderRef = db.collection('shaders').doc(validated.shaderId);
      batch.update(shaderRef, { usedBy: admin.firestore.FieldValue.increment(1) });
    }

    if (postData.isIndexed && postData.isVisible) {
      const liveFeedRef = db.collection('live_feed').doc(postRef.id);
      batch.set(liveFeedRef, postData);
    }

    await batch.commit();

    if (postData.isIndexed && postData.isVisible) {
      evictLiveFeed().catch((err) => console.error('Live feed eviction error:', err));
      // Notify everyone who saved this poet
      notifyFollowers(userId, postData, 'post').catch((err) => console.error('Notification error:', err));
    }

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

    const updateData = { ...validated, slug, updatedAt: now };
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
      notifyFollowers(userId, merged, 'post').catch(console.error);
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

    // Decrement tag counters
    for (const tagId of postData?.tagIds || []) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, { usedByPosts: admin.firestore.FieldValue.increment(-1) });
    }

    // Decrement shader counter
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

    // Increment tag counters
    for (const tagId of validated.tagIds || []) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, { usedByEvents: admin.firestore.FieldValue.increment(1) });
    }

    await batch.commit();
    
    // Notify everyone who saved this poet
    notifyFollowers(userId, eventData, 'event').catch((err) => console.error('Notification error:', err));

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

    // Notify the poet (owner)
    if (eventData?.ownerUserId) {
      const poetDoc = await db.collection('users').doc(eventData.ownerUserId).get();
      const poetData = poetDoc.data();
      if (poetData?.email) {
        await sendNotificationEmail(poetData.email, userEmail, { 
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
    await eventRef.update({ ...validated, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
  } catch (error: unknown) {
    console.error('updateEvent error:', error);
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
    await tagRef.set({ value, slug, usedByPosts: 0, usedByEvents: 0 });
    return { success: true, id: tagRef.id };
  } catch (error: unknown) {
    console.error('upsertTag error:', error);
    return { success: false, error: 'No se pudo crear la etiqueta.' };
  }
}

export async function updateUserProfile(userId: string, data: {
  username?: string;
  bio?: string;
  contacts?: { label: string; url: string }[];
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

    await db.collection('users').doc(userId).update(updateData);
    return { success: true };
  } catch (error: unknown) {
    console.error('updateUserProfile error:', error);
    return { success: false, error: 'No se pudo actualizar el perfil.' };
  }
}

// ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

async function evictLiveFeed(): Promise<void> {
  if (!db) return;
  // Use cursor-based approach: get 11th doc and delete everything from there
  const snapshot = await db.collection('live_feed')
    .orderBy('updatedAt', 'desc')
    .limit(LIVE_FEED_MAX + 1)
    .get();
  
  if (snapshot.docs.length <= LIVE_FEED_MAX) return;
  
  // Anything beyond index LIVE_FEED_MAX needs to be removed
  const toEvict = snapshot.docs.slice(LIVE_FEED_MAX);
  if (toEvict.length === 0) return;
  
  const batch = db.batch();
  toEvict.forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));
  await batch.commit();
}

async function notifyFollowers(userId: string, itemData: Record<string, unknown>, type: 'post' | 'event'): Promise<void> {
  if (!db) return;
  const followersSnapshot = await db.collection('users').doc(userId).collection('followers').get();
  const followerEmails: string[] = followersSnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.id);
  await Promise.allSettled(
    followerEmails.map((email) => sendNotificationEmail(email, userId, { ...itemData, type }))
  );
}

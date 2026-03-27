import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';

export async function saveUser(followerEmail: string, followedUserId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    const batch = db.batch();
    
    // Add to follower's "following" (private sub-collection)
    const followingRef = db.collection('users').doc(followerEmail).collection('following_users').doc(followedUserId);
    batch.set(followingRef, { 
      id: followedUserId,
      savedAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    // Add to followed user's "followers" (private sub-collection for notifications)
    const followerRef = db.collection('users').doc(followedUserId).collection('followers').doc(followerEmail);
    batch.set(followerRef, { 
      email: followerEmail,
      savedAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Save user error:', error);
    return { success: false, error: 'No se pudo seguir al usuario.' };
  }
}

export async function savePost(userEmail: string, postId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    const postRef = db.collection('users').doc(userEmail).collection('saved_posts').doc(postId);
    await postRef.set({
      id: postId,
      savedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Save post error:', error);
    return { success: false, error: 'No se pudo guardar el poema.' };
  }
}

export async function unsavePost(userEmail: string, postId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    await db.collection('users').doc(userEmail).collection('saved_posts').doc(postId).delete();
    return { success: true };
  } catch (error) {
    console.error('Unsave post error:', error);
    return { success: false, error: 'No se pudo eliminar de guardados.' };
  }
}

export async function saveEvent(userEmail: string, eventId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    const eventRef = db.collection('users').doc(userEmail).collection('saved_events').doc(eventId);
    await eventRef.set({
      id: eventId,
      savedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Save event error:', error);
    return { success: false, error: 'No se pudo guardar el evento.' };
  }
}

export async function unsaveEvent(userEmail: string, eventId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    await db.collection('users').doc(userEmail).collection('saved_events').doc(eventId).delete();
    return { success: true };
  } catch (error) {
    console.error('Unsave event error:', error);
    return { success: false, error: 'No se pudo eliminar de guardados.' };
  }
}

export async function unsaveUser(followerEmail: string, followedUserId: string) {
  if (!db) return { success: false, error: 'Servicio no disponible.' };
  try {
    const batch = db.batch();
    
    const followingRef = db.collection('users').doc(followerEmail).collection('following_users').doc(followedUserId);
    batch.delete(followingRef);
    
    const followerRef = db.collection('users').doc(followedUserId).collection('followers').doc(followerEmail);
    batch.delete(followerRef);
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Unsave user error:', error);
    return { success: false, error: 'No se pudo dejar de seguir al usuario.' };
  }
}

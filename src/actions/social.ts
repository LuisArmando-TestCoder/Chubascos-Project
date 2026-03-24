import { db } from '@/firebase/admin';
import * as admin from 'firebase-admin';

export async function saveUser(followerEmail: string, followedUserId: string) {
  try {
    const batch = db.batch();
    
    // Add to follower's "following" (private sub-collection)
    const followingRef = db.collection('users').doc(followerEmail).collection('following').doc(followedUserId);
    batch.set(followingRef, { savedAt: admin.firestore.FieldValue.serverTimestamp() });
    
    // Add to followed user's "followers" (private sub-collection for notifications)
    const followerRef = db.collection('users').doc(followedUserId).collection('followers').doc(followerEmail);
    batch.set(followerRef, { savedAt: admin.firestore.FieldValue.serverTimestamp() });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Save user error:', error);
    return { success: false, error: 'No se pudo seguir al usuario.' };
  }
}

export async function unsaveUser(followerEmail: string, followedUserId: string) {
  try {
    const batch = db.batch();
    
    const followingRef = db.collection('users').doc(followerEmail).collection('following').doc(followedUserId);
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

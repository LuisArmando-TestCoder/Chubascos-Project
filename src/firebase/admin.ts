import * as admin from 'firebase-admin';

export let initError: string | null = null;

export function initAdmin() {
  if (admin.apps.length > 0) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey      = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawKey) {
    try {
      let privateKey = rawKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }

      // Reconstruct the PEM key from raw base64 body, stripping any corruption
      if (privateKey.includes('BEGIN PRIVATE KEY')) {
        const rawBody = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----/g, '')
          .replace(/-----END PRIVATE KEY-----/g, '');

        // Strip any non-base64 characters (spaces, newlines, backslashes, etc.)
        const cleanBody = rawBody.replace(/[^a-zA-Z0-9+/=]/g, '');
        const chunks = cleanBody.match(/.{1,64}/g) || [];
        privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----`;
      } else {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      console.log('🔥 Firebase Admin initialized ✅');
      return;
    } catch (error: any) {
      console.error('⚠️  Firebase Admin initialization failed:', error.message);
      initError = error.message;
    }
  } else {
    const msg = '❌ Firebase Admin could not be initialized.\n' +
      '   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in your environment.';
    console.error(msg);
    initError = 'Missing env vars';
  }
}

// Auto-init on import
initAdmin();

export const db   = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth()      : null;
export const getDb   = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth()      : null;

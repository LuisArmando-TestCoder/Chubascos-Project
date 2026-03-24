import * as admin from 'firebase-admin';

// Function to initialize admin explicitly
export function initAdmin() {
  if (admin.apps.length > 0) return;

  try {
    // Attempt to load the service account key directly
    const serviceAccount = require('../../serviceAccountKey.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully via JSON ✅');
  } catch (error: any) {
    // Fallback to environment variables if the file is missing (e.g. in CI/CD)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        });
        console.log('Firebase Admin initialized via environment variables');
      } catch (innerError: any) {
        console.error('Firebase admin init error:', innerError.message);
      }
    }
  }
}

// Auto-init on import
initAdmin();

// Export accessors
export const getDb = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth() : null;

// Compatibility exports
export const db = admin.apps.length ? admin.firestore() : null as any;
export const auth = admin.apps.length ? admin.auth() : null as any;

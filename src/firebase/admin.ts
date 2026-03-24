import * as admin from 'firebase-admin';

// Function to initialize admin explicitly
export function initAdmin() {
  if (admin.apps.length > 0) return;

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountVar) {
    try {
      // 1. Definitively clean and parse the JSON string from env
      let cleanJson = serviceAccountVar.trim();
      
      // Remove wrapping single quotes if present (standard in some .env formats)
      if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) {
        cleanJson = cleanJson.slice(1, -1);
      }

      const serviceAccount = JSON.parse(cleanJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully via JSON string ✅');
    } catch (error: any) {
      console.error('Firebase admin init error from string:', error.message);
      
      // Fallback: try local file if available
      try {
        const serviceAccount = require('../../serviceAccountKey.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin initialized via local JSON file fallback');
      } catch (innerError: any) {
        console.error('All Firebase Admin initialization methods failed');
      }
    }
  } else {
    // If env var is missing, try local file directly
    try {
      const serviceAccount = require('../../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized via local JSON file');
    } catch (e) {
      // Silent for build
    }
  }
}

// Auto-init on import
initAdmin();

export const getDb = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth() : null;

export const db = admin.apps.length ? admin.firestore() : null as any;
export const auth = admin.apps.length ? admin.auth() : null as any;

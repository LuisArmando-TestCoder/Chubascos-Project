import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Function to initialize admin explicitly
export function initAdmin() {
  if (admin.apps.length > 0) return;

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

  // ── Strategy 1: Full JSON string in FIREBASE_SERVICE_ACCOUNT ──────────────
  if (serviceAccountVar) {
    try {
      let cleanJson = serviceAccountVar.trim();
      
      // Remove wrapping single quotes if present (standard in some .env formats)
      if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) {
        cleanJson = cleanJson.slice(1, -1);
      }

      // Fix common corrupted private key: literal newlines inside JSON string values
      // Replace literal newlines (that are inside the JSON string value) with \n
      // This fixes the "Bad escaped character" parse error
      cleanJson = cleanJson.replace(/("private_key"\s*:\s*")([\s\S]*?)(")/g, (_match, prefix, key, suffix) => {
        const fixedKey = key.replace(/\r?\n/g, '\\n').replace(/\\ /g, '\\n');
        return `${prefix}${fixedKey}${suffix}`;
      });

      const serviceAccount = JSON.parse(cleanJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('🔥 Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT ✅');
      return;
    } catch (error: any) {
      console.error('⚠️  Firebase admin init error from FIREBASE_SERVICE_ACCOUNT string:', error.message);
    }
  }

  // ── Strategy 2: Individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) ──
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawPrivateKey) {
    try {
      // Netlify/Vercel often stores private keys with literal \n; expand them:
      const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      console.log('🔥 Firebase Admin initialized via individual env vars (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY) ✅');
      return;
    } catch (error: any) {
      console.error('⚠️  Firebase admin init error from individual env vars:', error.message);
    }
  }

  // ── Strategy 3: Local serviceAccountKey.json file (dev fallback) ──────────
  try {
    const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(saPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('🔥 Firebase Admin initialized via local serviceAccountKey.json ✅');
      return;
    }
  } catch (e: any) {
    console.error('⚠️  Firebase admin init error from local JSON file:', e.message);
  }

  console.error('❌ All Firebase Admin initialization strategies failed. DB will be unavailable.');
}

// Auto-init on import
initAdmin();

export const getDb = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth() : null;

export const db = admin.apps.length ? admin.firestore() : null as any;
export const auth = admin.apps.length ? admin.auth() : null as any;

import * as admin from 'firebase-admin';

/**
 * Robustly repairs common issues in the FIREBASE_SERVICE_ACCOUNT JSON string:
 *
 * 1. Strips optional surrounding single quotes added by some .env formats
 * 2. Inside the "private_key" value, fixes:
 *    - Literal newlines (bare \n characters) → JSON-escaped \n
 *    - Backslash+space (\ ) → \n  (common copy-paste corruption)
 *    - Backslash+r+n (\r\n) → \n
 */
function repairServiceAccountJson(raw: string): string {
  let json = raw.trim();

  // Remove wrapping single quotes if present (some .env parsers keep them)
  if (json.startsWith("'") && json.endsWith("'")) {
    json = json.slice(1, -1);
  }

  // ── Fix private_key field ─────────────────────────────────────────────────
  // Strategy: extract everything between the opening and closing PEM markers,
  // normalise line endings, then rebuild the key as a valid JSON string value.
  json = json.replace(
    /"private_key"\s*:\s*"([\s\S]*?)(?<!\\)"/,
    (_match, keyBody: string) => {
      const fixed = keyBody
        .replace(/\\r\\n/g, '\\n')   // literal \r\n sequences
        .replace(/\r\n/g, '\\n')     // real CRLF inside the string
        .replace(/\r/g, '\\n')       // real CR
        .replace(/\n/g, '\\n')       // real LF
        .replace(/\\ /g, '\\n')      // backslash+space corruption
        .replace(/\\n\\n/g, '\\n');  // collapse accidental doubles
      return `"private_key":"${fixed}"`;
    }
  );

  return json;
}

export function initAdmin() {
  if (admin.apps.length > 0) return;

  // ── Strategy 1: FIREBASE_SERVICE_ACCOUNT full JSON string ─────────────────
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      const repaired = repairServiceAccountJson(serviceAccountVar);
      const serviceAccount = JSON.parse(repaired);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('🔥 Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT ✅');
      return;
    } catch (error: any) {
      console.error('⚠️  Firebase admin FIREBASE_SERVICE_ACCOUNT parse failed:', error.message);
    }
  }

  // ── Strategy 2: individual env vars ───────────────────────────────────────
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey      = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawKey) {
    try {
      // Netlify / Vercel store the key with literal \n that must be expanded
      const privateKey = rawKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      console.log('🔥 Firebase Admin initialized via individual env vars ✅');
      return;
    } catch (error: any) {
      console.error('⚠️  Firebase admin individual env vars failed:', error.message);
    }
  }

  console.error(
    '❌ Firebase Admin could not be initialized.\n' +
    '   Set FIREBASE_SERVICE_ACCOUNT (full JSON) or the three individual vars:\n' +
    '   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
  );
}

// Auto-init on import
initAdmin();

export const db   = admin.apps.length ? admin.firestore() : (null as any);
export const auth = admin.apps.length ? admin.auth()      : (null as any);
export const getDb   = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth()      : null;

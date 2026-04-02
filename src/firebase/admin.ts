import * as admin from 'firebase-admin';

/**
 * Robustly repairs the FIREBASE_SERVICE_ACCOUNT JSON string.
 */
function repairServiceAccountJson(raw: string): string {
  let json = raw.trim();

  if (json.startsWith("'") && json.endsWith("'")) {
    json = json.slice(1, -1);
  }

  const KEY_PREFIX = '"private_key":"';
  const prefixIdx = json.indexOf(KEY_PREFIX);
  if (prefixIdx !== -1) {
    const valueStart = prefixIdx + KEY_PREFIX.length;
    let valueEnd = valueStart;
    while (valueEnd < json.length && json[valueEnd] !== '"') {
      valueEnd++;
    }

    const rawKeyValue = json.slice(valueStart, valueEnd);
    const fixedKeyValue = rawKeyValue
      .replace(/\r\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\\ /g, '\\n')
      .replace(/\\\t/g, '\\n')
      .replace(/(\\n){2,}/g, '\\n')
      .replace(/\\([^"\\\/bfnrtu\n])/g, '\\n');

    json = json.slice(0, valueStart) + fixedKeyValue + json.slice(valueEnd);
  }

  return json;
}

export let initError: string | null = null;

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
      initError = error.message;
    }
  }

  // ── Strategy 2: individual env vars ───────────────────────────────────────
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey      = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawKey) {
    try {
      let privateKey = rawKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }

      // First, handle literal \n strings if they exist
      privateKey = privateKey.replace(/\\n/g, '\n');

      // Now, if it's a standard PEM, make sure it has the correct newlines
      if (privateKey.includes('BEGIN PRIVATE KEY')) {
        const header = '-----BEGIN PRIVATE KEY-----';
        const footer = '-----END PRIVATE KEY-----';
        const body = privateKey
          .replace(header, '')
          .replace(footer, '')
          .replace(/\s+/g, ''); // Remove ALL whitespace including newlines and spaces

        const chunks = body.match(/.{1,64}/g) || [];
        privateKey = `${header}\n${chunks.join('\n')}\n${footer}`;
      }

      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      console.log('🔥 Firebase Admin initialized via individual env vars ✅');
      return;
    } catch (error: any) {
      console.error('⚠️  Firebase admin individual env vars failed:', error.message);
      initError = error.message;
    }
  }

  const msg = '❌ Firebase Admin could not be initialized.\n' +
    '   Set FIREBASE_SERVICE_ACCOUNT (full JSON) or the individual vars:\n' +
    '   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY';
  console.error(msg);
  if (!initError) initError = 'Missing env vars';
}

// Auto-init on import
initAdmin();

export const db   = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth()      : null;
export const getDb   = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth()      : null;

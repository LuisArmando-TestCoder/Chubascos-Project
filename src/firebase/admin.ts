import * as admin from 'firebase-admin';

/**
 * Robustly repairs the FIREBASE_SERVICE_ACCOUNT JSON string.
 *
 * The most common production issue: the "private_key" value contains invalid
 * JSON escape sequences (e.g. backslash+space `\ `, bare newlines, CRLF, etc.)
 * because the key was copy-pasted or stored without proper escaping.
 *
 * Strategy: instead of a single regex we walk the string with indexOf to
 * precisely extract the key value, fix every invalid escape, then reassemble.
 */
function repairServiceAccountJson(raw: string): string {
  let json = raw.trim();

  // Strip optional surrounding single quotes left by some .env parsers
  if (json.startsWith("'") && json.endsWith("'")) {
    json = json.slice(1, -1);
  }

  // ── Locate and repair the private_key value ───────────────────────────────
  const KEY_PREFIX = '"private_key":"';
  const prefixIdx = json.indexOf(KEY_PREFIX);
  if (prefixIdx !== -1) {
    const valueStart = prefixIdx + KEY_PREFIX.length;

    // Walk forward until the closing `"`.
    // Private keys are PEM/base64 — they never contain a literal double-quote,
    // so the first `"` we hit is the closing delimiter.
    let valueEnd = valueStart;
    while (valueEnd < json.length && json[valueEnd] !== '"') {
      valueEnd++;
    }

    const rawKeyValue = json.slice(valueStart, valueEnd);

    const fixedKeyValue = rawKeyValue
      // Normalise actual newline characters first (they break JSON)
      .replace(/\r\n/g, '\\n')          // Windows CRLF
      .replace(/\r/g,   '\\n')          // old Mac CR
      .replace(/\n/g,   '\\n')          // Unix LF
      // Fix common copy-paste corruption: backslash followed by a space or tab
      .replace(/\\ /g,  '\\n')          // `\ ` → `\n`
      .replace(/\\\t/g, '\\n')          // `\  ` (tab variant) → `\n`
      // Collapse any double-escaped newlines introduced by the steps above
      .replace(/(\\n){2,}/g, '\\n')
      // Safety net: any remaining `\X` where X is not a valid JSON escape char
      // gets replaced with `\n` (most likely a corrupted line-break)
      .replace(/\\([^"\\\/bfnrtu\n])/g, '\\n');

    json = json.slice(0, valueStart) + fixedKeyValue + json.slice(valueEnd);
  }

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
      // Netlify / Vercel store the key with literal `\n` that must be expanded
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
    '   Set FIREBASE_SERVICE_ACCOUNT (full JSON) or the individual vars:\n' +
    '   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
  );
}

// Auto-init on import
initAdmin();

export const db   = admin.apps.length ? admin.firestore() : (null as any);
export const auth = admin.apps.length ? admin.auth()      : (null as any);
export const getDb   = () => admin.apps.length ? admin.firestore() : null;
export const getAuth = () => admin.apps.length ? admin.auth()      : null;

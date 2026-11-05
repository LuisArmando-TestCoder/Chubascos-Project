/**
 * Gives every event saved before venue time zones existed a real start
 * instant. Old events stored `day` as UTC midnight of the chosen date and kept
 * the hour apart, so in Costa Rica they left "upcoming" at 18:00 the day
 * before. This rewrites `day` = date + hour in America/Costa_Rica and sets
 * `timeZone`. Idempotent: events that already have a zone are skipped.
 *
 *   npx tsx src/scripts/migrate-event-times.ts --dry-run  # only report
 *   npx tsx src/scripts/migrate-event-times.ts            # write
 */
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { DEFAULT_EVENT_TIME_ZONE, eventDateString, eventStartMs, isValidTimeZone } from '../utils/eventTime';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!admin.apps.length) {
  if (!fs.existsSync(saPath)) {
    console.error('serviceAccountKey.json not found.');
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))) });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const db = admin.firestore();
  const snap = await db.collection('events').get();
  let pending = 0;
  let batch = db.batch();
  let inBatch = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (isValidTimeZone(data.timeZone) || !data.day) continue;
    const legacy = { day: { seconds: (data.day as admin.firestore.Timestamp).seconds }, hour: data.hour };
    const startMs = eventStartMs(legacy);
    if (!startMs) continue;
    console.log(`${dryRun ? '[dry] ' : ''}${doc.id}  ${eventDateString(legacy)} ${data.hour}  →  ${new Date(startMs).toISOString()}`);
    pending++;
    if (dryRun) continue;
    batch.update(doc.ref, { day: admin.firestore.Timestamp.fromMillis(startMs), timeZone: DEFAULT_EVENT_TIME_ZONE });
    if (++inBatch === 400) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (!dryRun && inBatch > 0) await batch.commit();
  console.log(`${pending} event(s) ${dryRun ? 'would be' : ''} migrated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

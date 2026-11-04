/**
 * Creates every tag in the taxonomy (src/data/tagTaxonomy.ts) that does not
 * exist yet in Firestore. Idempotent: matches by slug (and alias slugs), never
 * touches counters or existing documents. Roots are not tags.
 *
 *   npx tsx src/scripts/seed-taxonomy.ts            # create missing tags
 *   npx tsx src/scripts/seed-taxonomy.ts --dry-run  # only report
 */
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { allTagNodes } from '../data/tagTaxonomy';

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
  const snap = await db.collection('tags').get();
  const existing = new Set(snap.docs.map((d) => String(d.data().slug)));

  const missing = allTagNodes().filter((n) => !existing.has(n.slug));
  console.log(`Taxonomy tags: ${allTagNodes().length} · existing: ${existing.size} · to create: ${missing.length}`);
  if (dryRun || missing.length === 0) return;

  // Batches of ≤ 400 writes (Firestore limit is 500).
  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch();
    for (const node of missing.slice(i, i + 400)) {
      batch.set(db.collection('tags').doc(), {
        value: node.label,
        slug: node.slug,
        usedByPosts: 0,
        usedByEvents: 0,
        usedByBooks: 0,
      });
    }
    await batch.commit();
  }
  console.log(`Created ${missing.length} tags.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

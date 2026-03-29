/**
 * ☢️  NUKE SCRIPT — wipes everything, seeds Oriens with all poems
 *
 * Usage:  npm run nuke
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ─── Config ─────────────────────────────────────────────────────────────────
const FIRST_USER = {
  email:    'luisarmando.murillobaltodano@gmail.com',
  username: 'Oriens',
  bio:      '',
};

const POEMS_DIR = '/Users/luisarmandooriens/Desktop/projects/oriens/src/content/posts';
// ────────────────────────────────────────────────────────────────────────────

// Init admin
const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))) });
} else {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) { console.error('No Firebase credentials found.'); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa.trim().replace(/^'|'$/g, ''))) });
}

const db = admin.firestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function nukeCollection(collectionPath: string): Promise<number> {
  let total = 0;
  let snapshot = await db.collection(collectionPath).limit(400).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.docs.length;
    snapshot = await db.collection(collectionPath).limit(400).get();
  }
  return total;
}

async function nukeSubcollection(parentCollection: string, subcollection: string): Promise<void> {
  const parents = await db.collection(parentCollection).get();
  for (const parent of parents.docs) {
    let rest = await parent.ref.collection(subcollection).limit(400).get();
    while (!rest.empty) {
      const batch = db.batch();
      rest.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      rest = await parent.ref.collection(subcollection).limit(400).get();
    }
  }
}

/** Parse simple YAML-ish frontmatter: title, date, excerpt, tags */
function parseFrontmatter(content: string): {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { title: '', date: '', excerpt: '', tags: [], body: content.trim() };

  const fm = match[1];
  const body = match[2].trim();

  const get = (key: string) => {
    const m = fm.match(new RegExp(`^${key}:\\s*["\`]?([^\n"'\`]+)["\`]?`, 'm'));
    return m ? m[1].trim() : '';
  };

  const tagsMatch = fm.match(/^tags:\s*\[(.*?)\]/m);
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''))
    : [];

  return { title: get('title'), date: get('date'), excerpt: get('excerpt'), tags, body };
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function nuke() {
  console.log('\n☢️  NUKE INITIATED\n');

  // 1. Nuke subcollections
  console.log('🗑️  Clearing users/posts…');
  await nukeSubcollection('users', 'posts');
  console.log('🗑️  Clearing users/followers…');
  await nukeSubcollection('users', 'followers');

  // 2. Nuke top-level collections
  for (const col of ['events', 'users', 'live_feed', 'tags', 'shaders']) {
    const n = await nukeCollection(col);
    console.log(`🗑️  ${col}: ${n} docs deleted`);
  }

  // 3. Create seed tags
  console.log('\n🏷️  Seeding tags…');
  const tagValues = ['Oriens', 'Poesía', 'Prosa poética', 'Amor', 'Tiempo', 'Cuerpo', 'Memoria'];
  const tagMap: Record<string, string> = {}; // value → id
  for (const val of tagValues) {
    const ref = db.collection('tags').doc();
    await ref.set({
      id: ref.id,
      value: val,
      slug: val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, ''),
      usedByPosts: 0,
      usedByEvents: 0,
    });
    tagMap[val] = ref.id;
    console.log(`   ✓ #${val}`);
  }

  // 4. Create first user (userId = normalized email, matching auth.ts pattern)
  const userId = FIRST_USER.email.toLowerCase().trim();
  console.log(`\n🌱 Creating user ${userId}…`);
  await db.collection('users').doc(userId).set({
    id:            userId,
    email:         FIRST_USER.email,
    username:      FIRST_USER.username,
    usernameLower: FIRST_USER.username.toLowerCase(),
    bio:           FIRST_USER.bio,
    contacts:      [],
    sessionVersion: 1,
    tagIds:        [tagMap['Oriens']],
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
  });

  // 5. Seed poems
  console.log('\n📝 Seeding poems…');
  const files = fs.readdirSync(POEMS_DIR).filter((f) => f.endsWith('.md'));
  const defaultTagIds = [tagMap['Oriens'], tagMap['Poesía']];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POEMS_DIR, file), 'utf8');
    const { title, date, excerpt, body } = parseFrontmatter(raw);
    if (!title && !body) continue;

    const slug = slugFromFilename(file);
    const finalTitle = title || slug;

    // Parse date for createdAt
    let createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
    if (date) {
      const d = new Date(date + 'T12:00:00');
      createdAt = isNaN(d.getTime())
        ? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.Timestamp.fromDate(d);
    } else {
      createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    const postRef = db.collection('users').doc(userId).collection('posts').doc();
    const postData = {
      id:         postRef.id,
      userId,
      title:      finalTitle,
      content:    excerpt ? `*${excerpt}*\n\n${body}` : body,
      slug,
      tagIds:     defaultTagIds,
      isVisible:  true,
      isIndexed:  true,
      createdAt,
      updatedAt:  createdAt,
    };

    await postRef.set(postData);
    await db.collection('live_feed').doc(postRef.id).set(postData);
    console.log(`   ✓ "${finalTitle}"`);
  }

  // 6. Update tag counters
  const postCount = files.length;
  for (const tagId of defaultTagIds) {
    if (tagId) {
      await db.collection('tags').doc(tagId).update({
        usedByPosts: admin.firestore.FieldValue.increment(postCount),
      });
    }
  }

  // 7. Update user tag membership
  await db.collection('users').doc(userId).update({
    tagIds: defaultTagIds.filter(Boolean),
  });

  console.log(`\n✅ Done!`);
  console.log(`   User:  ${FIRST_USER.email} (id: ${userId})`);
  console.log(`   Name:  ${FIRST_USER.username}`);
  console.log(`   Poems: ${files.length} imported`);
  console.log('\nGo to /entrar and request a magic link.\n');

  process.exit(0);
}

nuke().catch((err) => {
  console.error('❌ Nuke failed:', err);
  process.exit(1);
});

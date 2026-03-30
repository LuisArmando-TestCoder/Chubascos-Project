import { config } from 'dotenv';
config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';

async function rebuildTagCounters() {
  console.log('Fetching all tags...');
  const tagsSnap = await db.collection('tags').get();
  const tags = tagsSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));

  const counts: Record<string, { posts: number, events: number }> = {};
  for (const tag of tags) {
    counts[tag.id] = { posts: 0, events: 0 };
  }

  console.log('Counting tags in posts...');
  const postsSnap = await db.collectionGroup('posts').get();
  postsSnap.forEach(doc => {
    const data = doc.data();
    if (data.tagIds && Array.isArray(data.tagIds)) {
      for (const tId of data.tagIds) {
        if (counts[tId]) counts[tId].posts++;
      }
    }
  });

  console.log('Counting tags in events...');
  const eventsSnap = await db.collection('events').get();
  eventsSnap.forEach(doc => {
    const data = doc.data();
    if (data.tagIds && Array.isArray(data.tagIds)) {
      for (const tId of data.tagIds) {
        if (counts[tId]) counts[tId].events++;
      }
    }
  });

  console.log('Updating tag counters in database...');
  let updated = 0;
  const batch = db.batch();
  for (const tag of tags) {
    const p = counts[tag.id].posts;
    const e = counts[tag.id].events;
    
    // Check if differs
    if (tag.usedByPosts !== p || tag.usedByEvents !== e || tag.usedBy !== undefined) {
      batch.update(tag.ref, {
        usedByPosts: p,
        usedByEvents: e,
        usedBy: admin.firestore.FieldValue.delete() // Cleanup old field
      });
      updated++;
    }
  }

  if (updated > 0) {
    await batch.commit();
    console.log(`Updated ${updated} tags with corrected counts.`);
  } else {
    console.log('All tag counters are already accurate.');
  }
}

rebuildTagCounters().catch(console.error);

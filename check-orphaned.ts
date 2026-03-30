import { config } from 'dotenv';
config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';

async function checkOrphanedTags() {
  const tagsSnap = await db.collection('tags').get();
  const validTagIds = new Set(tagsSnap.docs.map(d => d.id));
  
  const postsSnap = await db.collectionGroup('posts').get();
  
  let orphanedCount = 0;
  const missingIds = new Set<string>();

  postsSnap.forEach(d => {
    const data = d.data();
    if (data.tagIds && Array.isArray(data.tagIds)) {
      for (const tId of data.tagIds) {
        if (!validTagIds.has(tId)) {
          orphanedCount++;
          missingIds.add(tId);
          console.log(`Post ${d.id} has unknown tagId: ${tId}`);
        }
      }
    }
  });

  console.log(`Found ${orphanedCount} occurrences of unknown tagIds.`);
  console.log(`Unique missing tag IDs:`, Array.from(missingIds));
}

checkOrphanedTags().catch(console.error);

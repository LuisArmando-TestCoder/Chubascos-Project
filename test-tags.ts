import { config } from 'dotenv';
config({ path: '.env.local' });

// We must import these AFTER config
import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';
import { getTags, searchPostsByTag, searchEventsByTag } from './src/actions/data';

async function testTags() {
  console.log('Fetching tags...');
  const tags = await getTags(50);
  console.log(`Found ${tags.length} tags.`);

  for (const tag of tags) {
    if (tag.usedByPosts === 0 && tag.usedByEvents === 0) continue;
    console.log(`\nTag: ${tag.value} (ID: ${tag.id})`);
    console.log(`Expected Posts: ${tag.usedByPosts}, Expected Events: ${tag.usedByEvents}`);
    
    const postsResult = await searchPostsByTag(tag.id, 10);
    console.log(`Found Posts: ${postsResult.items.length}`);
    
    const eventsResult = await searchEventsByTag(tag.id, 10);
    console.log(`Found Events: ${eventsResult.items.length}`);
  }
}

testTags().catch(console.error);

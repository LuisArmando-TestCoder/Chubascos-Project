import { config } from 'dotenv';
config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';

async function testTagIssue() {
  const tagId = "Hp9VwTvGKYcyMjpAZH23"; // Latinoamérica

  const tagsColl = await db.collection('tags').doc(tagId).get();
  console.log("Tag:", tagsColl.data());

  const usersSnap = await db.collection('users').where('tagIds', 'array-contains', tagId).get();
  console.log(`Users with tag in 'tagIds': ${usersSnap.size}`);
  
  const postsSnap = await db.collectionGroup('posts').get();
  let count = 0;
  postsSnap.forEach(d => {
    const data = d.data();
    if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.includes(tagId)) {
      count++;
    }
  });
  console.log(`Posts with tag manually checked: ${count}`);

  const liveFeedSnap = await db.collection('live_feed').get();
  let liveFeedCount = 0;
  liveFeedSnap.forEach(d => {
    const data = d.data();
    if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.includes(tagId)) {
      liveFeedCount++;
    }
  });
  console.log(`Live feed with tag manually checked: ${liveFeedCount}`);
}

testTagIssue().catch(console.error);

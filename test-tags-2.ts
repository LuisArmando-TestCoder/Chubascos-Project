import { config } from 'dotenv';
config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';

async function testTagIssue() {
  const tagId = "Hp9VwTvGKYcyMjpAZH23"; // Latinoamérica

  const snap = await db.collectionGroup('posts').where('tagIds', 'array-contains', tagId).get();
  console.log(`Docs with tag in 'posts': ${snap.size}`);
  snap.forEach(d => console.log(d.id, d.data().isVisible));
  
  const snapLive = await db.collection('live_feed').where('tagIds', 'array-contains', tagId).get();
  console.log(`Docs with tag in 'live_feed': ${snapLive.size}`);
  
  const snapUsers = await db.collection('users').where('tagIds', 'array-contains', tagId).get();
  console.log(`Users with tag: ${snapUsers.size}`);
}

testTagIssue().catch(console.error);

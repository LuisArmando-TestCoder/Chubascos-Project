import { config } from 'dotenv';
config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';

async function testTagIssue() {
  const tagId = "Hp9VwTvGKYcyMjpAZH23"; // Latinoamérica

  try {
    const snap = await db.collectionGroup('posts')
      .where('tagIds', 'array-contains', tagId)
      .where('isVisible', '==', true)
      .orderBy('updatedAt', 'desc')
      .get();
    console.log(`Docs with tag in 'posts': ${snap.size}`);
  } catch(e: any) {
    console.error("Error posts:", e.message);
  }
}

testTagIssue().catch(console.error);

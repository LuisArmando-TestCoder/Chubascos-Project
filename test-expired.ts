import { config } from 'dotenv';
config({ path: '.env.local' });

import * as admin from 'firebase-admin';
import { db } from './src/firebase/admin';

async function testExpired() {
  const tagId = "Hp9VwTvGKYcyMjpAZH23"; // just a valid tag ID

  const now = admin.firestore.Timestamp.now();
  let q: admin.firestore.Query = db.collection('events')
    .where('tagIds', 'array-contains', tagId)
    .where('day', '<', now)
    .orderBy('day', 'desc')
    .limit(10);

  try {
    const snap = await q.get();
    console.log("Success! Found:", snap.size);
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}

testExpired().catch(console.error);

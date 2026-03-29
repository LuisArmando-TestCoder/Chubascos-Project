import { config } from 'dotenv';
config({ path: '.env.local' });

const key = process.env.FIREBASE_SERVICE_ACCOUNT;
if (key && key.startsWith("'") && key.endsWith("'")) {
  process.env.FIREBASE_SERVICE_ACCOUNT = key.slice(1, -1);
}

async function run() {
  const { db } = await import('./src/firebase/admin');
  if (!db) { console.error('No DB'); return; }
  
  const userId = 'luisarmando.murillobaltodano@gmail.com';
  console.log('Fetching posts for:', userId);
  const snapshot = await db.collection('users').doc(userId).collection('posts').get();
  
  if (snapshot.empty) {
    console.log('No posts found.');
    return;
  }
  
  console.log(`Found ${snapshot.docs.length} posts.`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Slug: "${data.slug}"`);
    console.log(`  isIndexed: ${data.isIndexed}, isVisible: ${data.isVisible}`);
  });
}

run().catch(console.error);

import { config } from 'dotenv';
config({ path: '.env.local' });

const key = process.env.FIREBASE_SERVICE_ACCOUNT;
if (key && key.startsWith("'") && key.endsWith("'")) {
  process.env.FIREBASE_SERVICE_ACCOUNT = key.slice(1, -1);
}

async function run() {
  const { getPost, getUserProfile } = await import('./src/actions/data');
  const userId = 'luisarmando.murillobaltodano@gmail.com';
  const slug = 'dramaturbios';
  console.log('Testing getPost for:', userId, slug);
  const post = await getPost(userId, slug);
  console.log('Post result:', post ? post.title : 'NULL');
  
  const user = await getUserProfile(userId);
  console.log('User profile:', user ? user.email : 'NULL');
}

run().catch(console.error);

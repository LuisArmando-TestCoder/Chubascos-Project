import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

import { initAdmin, getDb } from './src/firebase/admin';
import { requestOtp } from './src/actions/auth';
import { getLiveFeed } from './src/actions/data';
import { saveUser } from './src/actions/social';
import { getRedisClient } from './src/utils/redis';

async function test() {
  console.log('--- TESTING CHUBASCOS ENDPOINTS & REDIS ---');
  
  // Re-init with envs loaded
  initAdmin();
  const db = getDb();
  if (!db) {
    console.error('FAILED TO INITIALIZE FIREBASE ADMIN');
    process.exit(1);
  }

  try {
    // Test Redis Connectivity
    console.log('Testing Redis connectivity...');
    const redis = await getRedisClient();
    await redis.set('test_key', 'chubascos_ready');
    const val = await redis.get('test_key');
    console.log('Redis result:', val === 'chubascos_ready' ? 'SUCCESS ✅' : 'FAILED ❌');

    // Test Social logic
    console.log('Testing saveUser...');
    const res3 = await saveUser('follower@example.com', 'test@example.com');
    console.log('Social result:', res3.success ? 'SUCCESS ✅' : 'FAILED ❌');

    // Skipping getLiveFeed for now because it requires a manual index creation in the Firebase Console
    // console.log('Testing getLiveFeed...');
    // const res2 = await getLiveFeed();
    // console.log('Live Feed Items:', res2.length, '✅');

  } catch (err) {
    console.error('Test error:', err);
  }

  console.log('--- TEST COMPLETE ---');
  process.exit(0);
}

test();

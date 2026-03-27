import admin from 'firebase-admin';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
try {
  const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } else {
    throw new Error('serviceAccountKey.json not found');
  }
} catch (error) {
  console.error('Failed to load serviceAccountKey.json:', error);
  process.exit(1);
}

const db = admin.firestore();

// ─── ACTION SIMULATIONS ──────────────────────────────────────────────────────

async function simulateSocialActions(userIds: string[], userEmails: string[]) {
  console.log('🤝 Simulating social actions (Save/Unsave Users)...');
  for (let i = 0; i < 20; i++) {
    const followerEmail = faker.helpers.arrayElement(userEmails);
    const followedUserId = faker.helpers.arrayElement(userIds.filter(id => id !== followerEmail)); // Rough check
    
    console.log(`👤 User ${followerEmail} following ${followedUserId}...`);
    const batch = db.batch();
    batch.set(db.collection('users').doc(followerEmail).collection('following_users').doc(followedUserId), {
      id: followedUserId,
      savedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.set(db.collection('users').doc(followedUserId).collection('followers').doc(followerEmail), {
      email: followerEmail,
      savedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
  }
}

async function simulateEventParticipation(userIds: string[], userEmails: string[]) {
  console.log('🎟️  Simulating event participation (Join/Accept)...');
  const eventsSnapshot = await db.collection('events').limit(10).get();
  
  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const prospectiveParticipants = faker.helpers.arrayElements(userEmails, { min: 2, max: 5 });

    for (const email of prospectiveParticipants) {
      console.log(`📩 User ${email} requesting to join event ${eventData.title}...`);
      const participantRef = eventDoc.ref.collection('participants').doc(email);
      const isAccepted = faker.datatype.boolean();

      await participantRef.set({
        email,
        status: isAccepted ? 'accepted' : 'pending',
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedAt: isAccepted ? admin.firestore.FieldValue.serverTimestamp() : null
      });

      // If accepted, add to user's saved events
      if (isAccepted) {
        await db.collection('users').doc(email).collection('saved_events').doc(eventDoc.id).set({
          id: eventDoc.id,
          savedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  }
}

async function simulateSavedPoems(userIds: string[], userEmails: string[]) {
  console.log('🔖 Simulating saving poems...');
  const poemsSnapshot = await db.collection('live_feed').limit(20).get();

  for (let i = 0; i < 30; i++) {
    const email = faker.helpers.arrayElement(userEmails);
    const poem = faker.helpers.arrayElement(poemsSnapshot.docs);
    console.log(`💖 User ${email} saving poem ${poem.id}...`);
    
    await db.collection('users').doc(email).collection('saved_posts').doc(poem.id).set({
      id: poem.id,
      savedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

// ─── MAIN EXECUTION ─────────────────────────────────────────────────────────

async function runSimulation() {
  console.log('🚀 Starting Action Simulation Script...');

  const usersSnapshot = await db.collection('users').get();
  const userIds = usersSnapshot.docs.map(doc => doc.id);
  const userEmails = usersSnapshot.docs.map(doc => doc.data().email);

  if (userIds.length === 0) {
    console.error('❌ No users found. Run seed script first.');
    process.exit(1);
  }

  await simulateSocialActions(userIds, userEmails);
  await simulateEventParticipation(userIds, userEmails);
  await simulateSavedPoems(userIds, userEmails);

  console.log('✅ Action simulation complete!');
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('❌ Simulation failed:', err);
  process.exit(1);
});

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

const EVENTS_PER_USER = 5;

async function createBulkEvents() {
  console.log('🚀 Starting bulk event generation for existing users...');

  // 1. Get all users
  const usersSnapshot = await db.collection('users').get();
  if (usersSnapshot.empty) {
    console.error('❌ No users found in database. Run seed script first.');
    process.exit(1);
  }
  const userIds = usersSnapshot.docs.map(doc => doc.id);

  // 2. Get tags
  const tagsSnapshot = await db.collection('tags').get();
  const tagIds = tagsSnapshot.docs.map(doc => doc.id);

  console.log(`👤 Found ${userIds.length} users. Creating ${userIds.length * EVENTS_PER_USER} events...`);

  for (const userId of userIds) {
    console.log(`📅 Creating events for user ${userId}...`);
    
    for (let i = 0; i < EVENTS_PER_USER; i++) {
      const eventRef = db.collection('events').doc();
      const selectedTags = faker.helpers.arrayElements(tagIds, { min: 1, max: 2 });
      
      const eventData = {
        id: eventRef.id,
        ownerUserId: userId,
        title: faker.company.catchPhrase(),
        description: faker.lorem.paragraph(),
        day: admin.firestore.Timestamp.fromDate(faker.date.future()),
        hour: `${faker.number.int({ min: 10, max: 23 })}:00`,
        place: faker.location.streetAddress(),
        price: faker.number.int({ min: 0, max: 100 }),
        urls: [faker.internet.url()],
        contacts: [faker.internet.email()],
        tagIds: selectedTags,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await eventRef.set(eventData);

      // Increment tag counts
      for (const tagId of selectedTags) {
        await db.collection('tags').doc(tagId).update({
          usedBy: admin.firestore.FieldValue.increment(1)
        });
      }
    }
  }

  console.log('✅ Bulk event generation complete!');
  process.exit(0);
}

createBulkEvents().catch((err) => {
  console.error('❌ Bulk event generation failed:', err);
  process.exit(1);
});

import admin from 'firebase-admin';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Use local service account file for seed script
try {
  const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    throw new Error('serviceAccountKey.json not found');
  }
} catch (error) {
  console.error('Failed to load serviceAccountKey.json from local path:', error);
  // Try fallback if needed
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    const serviceAccount = JSON.parse(serviceAccountVar.trim().replace(/^'|'$/g, ''));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

const db = admin.firestore();

const COUNT = 50;

async function seed() {
  console.log('🚀 Starting seed process...');

  // 1. Tags
  console.log('🏷️  Seeding tags...');
  const tags = ['Poesía', 'Amor', 'Naturaleza', 'Misterio', 'Gótico', 'Abstracto', 'Costa Rica', 'Mundo', 'Sueños', 'Realidad'];
  const tagIds: string[] = [];
  for (const tag of tags) {
    const slug = tag.toLowerCase().replace(/\s+/g, '-');
    const tagRef = db.collection('tags').doc();
    await tagRef.set({
      id: tagRef.id,
      value: tag,
      slug,
      usedBy: 0,
    });
    tagIds.push(tagRef.id);
  }

  // 2. Users
  console.log('👤 Seeding users...');
  const userIds: string[] = [];
  const userEmails: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    const userRef = db.collection('users').doc();
    const email = faker.internet.email().toLowerCase();
    const username = faker.internet.username();
    await userRef.set({
      id: userRef.id,
      email,
      username,
      usernameLower: username.toLowerCase(),
      bio: faker.lorem.sentence(),
      contacts: [
        { label: 'Instagram', url: `https://instagram.com/${username}` },
        { label: 'Twitter', url: `https://twitter.com/${username}` },
      ],
      sessionVersion: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    userIds.push(userRef.id);
    userEmails.push(email);
  }

  // 3. Poems (Posts)
  console.log('📝 Seeding poems...');
  for (let i = 0; i < COUNT * 2; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const title = faker.lorem.words(3);
    const slug = title.toLowerCase().replace(/\s+/g, '-') + '-' + faker.string.alphanumeric(5);
    const postRef = db.collection('users').doc(userId).collection('posts').doc();
    
    const selectedTags = faker.helpers.arrayElements(tagIds, { min: 1, max: 3 });

    const postData = {
      id: postRef.id,
      userId,
      title,
      content: faker.lorem.paragraphs(2),
      slug,
      tagIds: selectedTags,
      isVisible: true,
      isIndexed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await postRef.set(postData);

    // Also to live_feed
    await db.collection('live_feed').doc(postRef.id).set(postData);

    // Increment tag counts
    for (const tagId of selectedTags) {
      await db.collection('tags').doc(tagId).update({
        usedBy: admin.firestore.FieldValue.increment(1)
      });
    }
  }

  // 4. Events
  console.log('📅 Seeding events...');
  for (let i = 0; i < COUNT; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const eventRef = db.collection('events').doc();
    const selectedTags = faker.helpers.arrayElements(tagIds, { min: 1, max: 2 });

    await eventRef.set({
      id: eventRef.id,
      ownerUserId: userId,
      title: faker.company.catchPhrase(),
      description: faker.lorem.paragraph(),
      day: admin.firestore.Timestamp.fromDate(faker.date.future()),
      hour: '19:00',
      place: faker.location.streetAddress(),
      price: faker.number.int({ min: 0, max: 50 }),
      urls: [faker.internet.url()],
      contacts: [faker.internet.email()],
      tagIds: selectedTags,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment tag counts
    for (const tagId of selectedTags) {
      await db.collection('tags').doc(tagId).update({
        usedBy: admin.firestore.FieldValue.increment(1)
      });
    }
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

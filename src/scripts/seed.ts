import admin from 'firebase-admin';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { REALISTIC_POETS, REALISTIC_EVENTS } from './realistic-data';

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

async function seed() {
  console.log('🚀 Starting seed process...');

  // 1. Tags (Curated and unique)
  console.log('🏷️  Seeding tags...');
  const tags = [
    'Surrealismo', 'Ultraísmo', 'Existencialismo', 'Beat', 'Confesional', 
    'Slam Poetry', 'Poesía Visual', 'Costa Rica', 'Cyberpunk', 'Naturaleza',
    'Amor', 'Muerte', 'Tiempo', 'Silencio', 'Cuerpo', 'Memoria'
  ];
  const tagIds: string[] = [];
  
  // Clear existing tags to avoid duplicates
  const existingTags = await db.collection('tags').get();
  for (const doc of existingTags.docs) {
    await doc.ref.delete();
  }

  for (const tag of tags) {
    const slug = tag.toLowerCase().replace(/\s+/g, '-');
    const tagRef = db.collection('tags').doc();
    await tagRef.set({
      id: tagRef.id,
      value: tag,
      slug,
      usedByPosts: 0,
      usedByEvents: 0,
    });
    tagIds.push(tagRef.id);
  }

  // 2. Users
  console.log('👤 Seeding users...');
  const userIds: string[] = [];
  const userEmails: string[] = [];

  for (const poetData of REALISTIC_POETS) {
    const userRef = db.collection('users').doc();
    const email = `${poetData.username.toLowerCase()}@chubascos.com`;
    const username = poetData.username;
    
    await userRef.set({
      id: userRef.id,
      email,
      username,
      usernameLower: username.toLowerCase(),
      bio: poetData.bio,
      contacts: [
        { label: 'Instagram', url: `https://instagram.com/${username}` },
        { label: 'Twitter', url: `https://twitter.com/${username}` },
      ],
      sessionVersion: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    userIds.push(userRef.id);
    userEmails.push(email);

    // 3. Poems for this specific user
    console.log(`📝 Seeding poems for ${username}...`);
    for (const poem of poetData.poems) {
      const slug = poem.title.toLowerCase().replace(/\s+/g, '-') + '-' + faker.string.alphanumeric(5);
      const postRef = db.collection('users').doc(userRef.id).collection('posts').doc();
      
      // Select tags that make sense for the poet
      let poetTags: string[] = [];
      if (poetData.username.includes('Pizarnik')) poetTags = ['Surrealismo', 'Existencialismo', 'Silencio', 'Muerte'];
      if (poetData.username.includes('Lorca')) poetTags = ['Surrealismo', 'Naturaleza', 'Cuerpo', 'Slam Poetry'];
      if (poetData.username.includes('Borges')) poetTags = ['Ultraísmo', 'Tiempo', 'Memoria', 'Existencialismo'];
      if (poetData.username.includes('Storni')) poetTags = ['Confesional', 'Cuerpo', 'Naturaleza', 'Amor'];
      if (poetData.username.includes('Whitman')) poetTags = ['Beat', 'Naturaleza', 'Cuerpo', 'Cyberpunk'];

      const relevantTagIds = tagIds.filter(id => {
        const tag = tags[tagIds.indexOf(id)];
        return poetTags.includes(tag);
      });

      const selectedTags = faker.helpers.arrayElements(relevantTagIds.length > 0 ? relevantTagIds : tagIds, { min: 1, max: 3 });

      const postData = {
        id: postRef.id,
        userId: userRef.id,
        title: poem.title,
        content: poem.content,
        slug,
        tagIds: selectedTags,
        isVisible: true,
        isIndexed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await postRef.set(postData);
      await db.collection('live_feed').doc(postRef.id).set(postData);

      for (const tagId of selectedTags) {
        await db.collection('tags').doc(tagId).update({
          usedByPosts: admin.firestore.FieldValue.increment(1)
        });
      }
    }
  }

  // 4. Events
  console.log('📅 Seeding events...');
  for (let i = 0; i < REALISTIC_EVENTS.length; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const eventRef = db.collection('events').doc();
    const selectedTags = faker.helpers.arrayElements(tagIds, { min: 1, max: 2 });
    const eventTitle = REALISTIC_EVENTS[i];

    await eventRef.set({
      id: eventRef.id,
      ownerUserId: userId,
      title: eventTitle,
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

    for (const tagId of selectedTags) {
      await db.collection('tags').doc(tagId).update({
        usedByEvents: admin.firestore.FieldValue.increment(1)
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

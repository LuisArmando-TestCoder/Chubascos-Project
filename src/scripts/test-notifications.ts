import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually and fix \n
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2];
      // remove quotes if any
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, '\n');
      process.env[key] = val;
    }
  });
}

import { saveUser, savePost } from '../actions/social';
import { createPost, createEvent, getSavedItems } from '../actions/data';

async function runTests() {
  console.log('--- TEST SAVES AND NOTIFICATIONS ---');
  
  const testFollowerId = 'test-follower@example.com';
  const testPoetId = 'test-poet@example.com';

  console.log('1. Guardando un poeta (Follow User)...');
  const followRes = await saveUser(testFollowerId, testPoetId);
  console.log('saveUser resultado:', followRes);

  console.log('2. Comprobando guardados usando getSavedItems...');
  const items = await getSavedItems([testPoetId], 'users');
  console.log('getSavedItems usuarios:', items.items.length, 'encontrados.');

  const randomContent = 'Contenido aleatorio ' + Math.random().toString() + '. Con algo de markdown: **bold** y [link](http://test.com).';
  console.log('3. Creando poema nuevo (Debe disparar email y no dar error)...');
  const postRes = await createPost(testPoetId, {
    title: 'Poema de Prueba 1',
    slug: 'poema-de-prueba-1-' + Date.now(),
    tagIds: [],
    content: randomContent,
    isIndexed: true,
    isVisible: true
  });
  console.log('createPost 1 resultado:', postRes);

  console.log('4. Intentando crear el mismo poema nuevamente (Prueba Anti-Spam)...');
  const postRes2 = await createPost(testPoetId, {
    title: 'Poema de Prueba 1 Copia',
    slug: 'poema-de-prueba-1-copia-' + Date.now(),
    tagIds: [],
    content: randomContent,
    isIndexed: true,
    isVisible: true
  });
  console.log('createPost 2 resultado:', postRes2);

  console.log('5. Limpieza de datos (Cleanup)...');
  const { db } = await import('../firebase/admin');
  if (db) {
    const batch = db.batch();
    
    // Clean up follower relationship
    batch.delete(db.collection('users').doc(testFollowerId).collection('following_users').doc(testPoetId));
    batch.delete(db.collection('users').doc(testPoetId).collection('followers').doc(testFollowerId));
    
    // Clean up created posts
    if (postRes.success && postRes.id) {
      batch.delete(db.collection('users').doc(testPoetId).collection('posts').doc(postRes.id));
      batch.delete(db.collection('live_feed').doc(postRes.id));
    }
    if (postRes2.success && postRes2.id) {
      batch.delete(db.collection('users').doc(testPoetId).collection('posts').doc(postRes2.id));
      batch.delete(db.collection('live_feed').doc(postRes2.id));
    }

    // Clean up the generated anti-spam hash
    const { generateContentHash } = await import('../actions/data/common');
    const hash = generateContentHash(randomContent);
    batch.delete(db.collection('users').doc(testPoetId).collection('notified_hashes').doc(hash));

    await batch.commit();
    console.log('Datos de prueba eliminados exitosamente de la base de datos.');
  }
  
  console.log('¡Pruebas terminadas sin interferir con usuarios reales!');
}

runTests().catch(console.error);

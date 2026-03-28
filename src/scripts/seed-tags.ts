import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

try {
  const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

const POETRY_TAGS = [
  // --- Estilos y formas métricas ---
  { value: 'Soneto', slug: 'soneto' },
  { value: 'Haiku', slug: 'haiku' },
  { value: 'Verso libre', slug: 'verso-libre' },
  { value: 'Oda', slug: 'oda' },
  { value: 'Elegía', slug: 'elegia' },
  { value: 'Balada', slug: 'balada' },
  { value: 'Epigrama', slug: 'epigrima' },
  { value: 'Villanela', slug: 'villanela' },
  { value: 'Prosa poética', slug: 'prosa-poetica' },
  { value: 'Poema visual', slug: 'poema-visual' },
  { value: 'Slam poetry', slug: 'slam-poetry' },
  { value: 'Poesía concreta', slug: 'poesia-concreta' },
  { value: 'Décima', slug: 'decima' },
  { value: 'Terceto', slug: 'terceto' },
  { value: 'Cuarteto', slug: 'cuarteto' },
  { value: 'Alejandrino', slug: 'alejandrino' },

  // --- Emociones y estados de ánimo ---
  { value: 'Amor', slug: 'amor' },
  { value: 'Desamor', slug: 'desamor' },
  { value: 'Melancolía', slug: 'melancolia' },
  { value: 'Nostalgia', slug: 'nostalgia' },
  { value: 'Rabia', slug: 'rabia' },
  { value: 'Soledad', slug: 'soledad' },
  { value: 'Esperanza', slug: 'esperanza' },
  { value: 'Alegría', slug: 'alegria' },
  { value: 'Miedo', slug: 'miedo' },
  { value: 'Duelo', slug: 'duelo' },
  { value: 'Éxtasis', slug: 'extasis' },
  { value: 'Angustia', slug: 'angustia' },
  { value: 'Ternura', slug: 'ternura' },
  { value: 'Deseo', slug: 'deseo' },
  { value: 'Abandono', slug: 'abandono' },
  { value: 'Gratitud', slug: 'gratitud' },

  // --- Temáticas ---
  { value: 'Naturaleza', slug: 'naturaleza' },
  { value: 'Mar', slug: 'mar' },
  { value: 'Lluvia', slug: 'lluvia' },
  { value: 'Noche', slug: 'noche' },
  { value: 'Ciudad', slug: 'ciudad' },
  { value: 'Infancia', slug: 'infancia' },
  { value: 'Vejez', slug: 'vejez' },
  { value: 'Muerte', slug: 'muerte' },
  { value: 'Cuerpo', slug: 'cuerpo' },
  { value: 'Tiempo', slug: 'tiempo' },
  { value: 'Identidad', slug: 'identidad' },
  { value: 'Memoria', slug: 'memoria' },
  { value: 'Sueños', slug: 'suenos' },
  { value: 'Silencio', slug: 'silencio' },
  { value: 'Exilio', slug: 'exilio' },
  { value: 'Resistencia', slug: 'resistencia' },
  { value: 'Fe', slug: 'fe' },
  { value: 'Espiritualidad', slug: 'espiritualidad' },
  { value: 'Política', slug: 'politica' },
  { value: 'Erotismo', slug: 'erotismo' },
  { value: 'Filosofía', slug: 'filosofia' },
  { value: 'Viaje', slug: 'viaje' },
  { value: 'Amistad', slug: 'amistad' },
  { value: 'Madre', slug: 'madre' },
  { value: 'Padre', slug: 'padre' },

  // --- Movimientos / escuelas ---
  { value: 'Romántico', slug: 'romantico' },
  { value: 'Modernismo', slug: 'modernismo' },
  { value: 'Vanguardia', slug: 'vanguardia' },
  { value: 'Surrealismo', slug: 'surrealismo' },
  { value: 'Existencialismo', slug: 'existencialismo' },
  { value: 'Minimalismo', slug: 'minimalismo' },
  { value: 'Neobarroco', slug: 'neobarroco' },
  { value: 'Beat', slug: 'beat' },
  { value: 'Contemporáneo', slug: 'contemporaneo' },
  { value: 'Experimental', slug: 'experimental' },

  // --- Tono / voz ---
  { value: 'Irónico', slug: 'ironico' },
  { value: 'Lúdico', slug: 'ludico' },
  { value: 'Confesional', slug: 'confesional' },
  { value: 'Épico', slug: 'epico' },
  { value: 'Lírico', slug: 'lirico' },
  { value: 'Satírico', slug: 'satirico' },
  { value: 'Íntimo', slug: 'intimo' },
  { value: 'Narrativo', slug: 'narrativo' },
  { value: 'Abstracto', slug: 'abstracto' },
  { value: 'Místico', slug: 'mistico' },

  // --- Contexto / geografía ---
  { value: 'Costa Rica', slug: 'costa-rica' },
  { value: 'Latinoamérica', slug: 'latinoamerica' },
  { value: 'España', slug: 'espana' },
  { value: 'Caribe', slug: 'caribe' },
  { value: 'Mundo', slug: 'mundo' },
  { value: 'Diáspora', slug: 'diaspora' },
];

async function seedTags() {
  console.log('🏷️  Seeding expanded poetry tags...');

  const existing = await db.collection('tags').get();
  const existingSlugs = new Set(existing.docs.map(d => d.data().slug));

  let added = 0;
  let skipped = 0;

  for (const tag of POETRY_TAGS) {
    if (existingSlugs.has(tag.slug)) {
      skipped++;
      continue;
    }
    const ref = db.collection('tags').doc();
    await ref.set({ id: ref.id, value: tag.value, slug: tag.slug, usedBy: 0 });
    added++;
    console.log(`  ✅ Added: ${tag.value}`);
  }

  console.log(`\n✅ Done! Added ${added} new tags, skipped ${skipped} existing.`);
  process.exit(0);
}

seedTags().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});

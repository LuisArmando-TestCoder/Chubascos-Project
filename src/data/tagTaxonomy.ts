/**
 * Chubascos tag taxonomy: a tree you can fall through.
 *
 * Seven hyper-general roots (how a poem is made, what it is about, how it
 * feels, where it comes from, how it looks, where it rains, which patterns
 * it repeats) narrowing level by level until the leaves are very specific
 * internet tropes and micro-aesthetics.
 *
 * - Roots are for browsing only: they are not tags and can't be applied.
 * - Every other node IS a Firestore tag, matched by `slug` (see
 *   `src/scripts/seed-taxonomy.ts`, idempotent).
 * - `aliases` fold legacy duplicate/misspelt tags into one node, so old
 *   posts still appear under the right branch.
 * - Internet aesthetics and tropes keep the name they circulate under.
 *
 * Sources and reasoning: TAXONOMIA.md.
 */
import { generateSlug } from '@/utils/generateSlug';

export type TaxonNode = {
  slug: string;
  label: string;
  /** One line that explains the node when the name alone is not enough. */
  gloss?: string;
  /** Legacy tag slugs that mean the same thing. */
  aliases?: string[];
  /** Roots are navigation, not tags. */
  root?: boolean;
  children: TaxonNode[];
};

type Opts = { gloss?: string; slug?: string; aliases?: string[] };

function t(label: string, children: TaxonNode[] = [], opts: Opts = {}): TaxonNode {
  return {
    label,
    slug: opts.slug ?? generateSlug(label),
    ...(opts.gloss ? { gloss: opts.gloss } : {}),
    ...(opts.aliases ? { aliases: opts.aliases } : {}),
    children,
  };
}
const g = (label: string, gloss: string, children: TaxonNode[] = [], opts: Omit<Opts, 'gloss'> = {}) =>
  t(label, children, { ...opts, gloss });
function root(label: string, gloss: string, children: TaxonNode[]): TaxonNode {
  return { label, slug: `raiz-${generateSlug(label)}`, gloss, root: true, children };
}

export const TAXONOMY: TaxonNode[] = [
  // ── 1 ── FORMA ──────────────────────────────────────────────────────────
  root('Forma', 'Cómo está hecho', [
    t('Poesía', [], { aliases: ['poesa'] }),
    g('Modo', 'Los grandes géneros de la palabra', [
      t('Lírico'),
      t('Narrativo'),
      t('Épico'),
      t('Dramático', [t('Poema dramático'), t('Monólogo dramático')]),
    ]),
    g('Verso', 'La línea como unidad', [
      t('Verso libre'),
      g('Verso medido', 'Sílabas contadas', [
        t('Arte menor', [t('Octosílabo', [g('Romance octosílabo', 'Tirada de octosílabos con rima en los pares')])]),
        t('Endecasílabo'),
        t('Alejandrino'),
      ]),
      t('Estrofas', [t('Terceto'), t('Cuarteto'), t('Lira'), t('Décima'), t('Copla'), t('Seguidilla')]),
      g('Formas fijas', 'Moldes con reglas heredadas', [
        t('Soneto', [t('Soneto petrarquista'), t('Soneto inglés'), g('Soneto en verso libre', 'Catorce líneas sin métrica')]),
        t('Villanela'),
        t('Sextina'),
        t('Ghazal'),
        t('Pantun'),
        t('Glosa'),
        t('Madrigal'),
        t('Haiku', [t('Senryu'), t('Tanka'), g('Haibun', 'Prosa y haiku entrelazados')]),
      ]),
    ]),
    g('Formas clásicas', 'Géneros con siglos de historia', [
      t('Oda'),
      t('Elegía'),
      t('Égloga'),
      t('Himno'),
      t('Balada'),
      t('Epigrama', [], { aliases: ['epigrima'] }),
      t('Epitafio'),
      g('Albada', 'Canto de amantes que se separan al amanecer'),
      t('Sátira'),
    ]),
    t('Prosa', [
      t('Prosa poética', [], { aliases: ['prosa-potica'] }),
      t('Poema en prosa'),
      t('Microrrelato'),
      t('Aforismo'),
      t('Fragmento'),
      t('Diario'),
    ]),
    t('Visual', [
      t('Poema visual', [t('Caligrama'), t('Poesía concreta')]),
      g('Blackout poetry', 'Tachar una página hasta que quede un poema', [t('Erasure poetry')]),
      t('Collage'),
    ]),
    t('Voz y escena', [
      t('Slam poetry', [t('Spoken word')]),
      t('Poesía sonora'),
      t('Canción'),
      t('Recital'),
    ]),
    t('Digital', [
      g('Instapoetry', 'Poemas breves pensados para el feed', [g('Poesía en carrusel', 'Un poema repartido en diapositivas')]),
      g('Found poetry', 'Poemas armados con textos ajenos', [g('Poesía de capturas', 'Mensajes, notificaciones y chats como material')]),
      t('Poesía generativa'),
      g('Twitterature', 'Poesía en hilos y en 280 caracteres'),
    ]),
    t('Experimental', [
      g('Oulipo', 'Escritura bajo restricciones'),
      t('Cut-up'),
      t('Antipoesía'),
    ]),
  ]),

  // ── 2 ── TEMA ───────────────────────────────────────────────────────────
  root('Tema', 'De qué trata', [
    t('Amor', [
      t('Deseo', [t('Erotismo')]),
      g('Romance', 'Relato o vivencia amorosa'),
      t('Desamor', [t('Abandono'), t('Ruptura'), t('Amor no correspondido')]),
      t('Amor propio'),
      t('Amistad'),
    ]),
    t('Cuerpo', [
      t('Salud y enfermedad', [t('Salud mental')]),
      t('Sexualidad'),
      t('Género', [t('Poesía queer'), t('Feminismo')]),
    ]),
    t('Familia y origen', [
      t('Madre'),
      t('Padre'),
      t('Infancia'),
      t('Abuelos'),
      t('Hermanos'),
      t('Casa'),
      t('Linaje'),
    ]),
    t('Tiempo', [
      t('Memoria'),
      t('Juventud'),
      t('Vejez'),
      t('Estaciones'),
    ]),
    t('Muerte', [
      t('Duelo'),
      t('Fantasmas'),
    ]),
    t('Pensamiento', [
      t('Filosofía', [t('Existencialismo'), t('Absurdo'), t('Nihilismo'), t('Metafísica')]),
      t('Identidad'),
      g('Metapoesía', 'Poemas sobre escribir poemas'),
      t('Lenguaje'),
    ]),
    t('Lo sagrado', [
      t('Espiritualidad'),
      t('Fe'),
      t('Místico'),
      t('Mitología'),
      t('Brujería'),
    ]),
    t('Naturaleza', [
      t('Lluvia', [t('Chubasco'), t('Tormenta'), t('Charco')]),
      t('Mar'),
      t('Noche'),
      t('Animales'),
      t('Plantas'),
      t('Montaña'),
      t('Crisis climática'),
    ]),
    t('Ciudad y mundo', [
      t('Ciudad'),
      t('Mundo'),
      t('Viaje'),
      t('Migración', [t('Exilio'), t('Diáspora')]),
      t('Trabajo'),
      t('Tecnología', [t('Internet'), t('Inteligencia artificial')]),
    ]),
    t('Sociedad', [
      t('Política', [t('Resistencia'), t('Protesta'), t('Memoria histórica')]),
      t('Clase social'),
      t('Violencia'),
      t('Colonialismo'),
    ]),
    t('Imaginación', [
      t('Sueños'),
      t('Fantasía'),
    ]),
  ]),

  // ── 3 ── ÁNIMO ──────────────────────────────────────────────────────────
  root('Ánimo', 'Cómo se siente', [
    t('Luz', [t('Alegría'), t('Esperanza'), t('Gratitud'), t('Ternura'), t('Asombro')]),
    t('Quietud', [t('Calma'), t('Silencio')]),
    t('Sombra', [
      t('Melancolía', [t('Nostalgia', [g('Saudade', 'Ausencia que se siente presente')])]),
      t('Tristeza'),
      t('Soledad'),
      t('Angustia'),
      t('Miedo'),
      t('Rabia'),
      t('Vacío'),
    ]),
    t('Intensidad', [t('Íntimo'), t('Éxtasis'), t('Delirio')]),
    t('Humor', [t('Lúdico'), t('Irónico'), t('Satírico'), g('Humor absurdo', 'Risa que nace del sinsentido')]),
    g('Penas oscuras', 'Emociones sin nombre, nombradas por The Dictionary of Obscure Sorrows', [
      g('Sonder', 'Darte cuenta de que cada desconocido vive una vida tan compleja como la tuya'),
      g('Anemoia', 'Nostalgia por una época que nunca viviste'),
      g('Kenopsia', 'La extrañeza de un lugar habitado, ahora vacío'),
      g('Vellichor', 'La melancolía de las librerías de viejo'),
      g('Opia', 'La intensidad de mirar a alguien a los ojos'),
      g('Monachopsis', 'Sentir que no perteneces a donde estás'),
      g('Exulansis', 'Dejar de contar algo porque nadie lo entiende'),
    ]),
  ]),

  // ── 4 ── TRADICIÓN ──────────────────────────────────────────────────────
  root('Tradición', 'De dónde viene', [
    t('Lírica antigua y medieval', [g('Jarchas', 'Las primeras cancioncillas en romance'), t('Trovadores'), t('Amor cortés')]),
    t('Siglo de Oro', [t('Renacimiento'), t('Barroco', [t('Conceptismo'), t('Culteranismo')])]),
    t('Siglo XIX', [t('Romántico'), t('Simbolismo'), t('Parnasianismo'), t('Modernismo')]),
    t('Vanguardia', [
      t('Surrealismo'),
      t('Dadaísmo'),
      t('Creacionismo'),
      t('Ultraísmo'),
      t('Estridentismo'),
      t('Futurismo'),
    ]),
    t('Siglo XX', [
      t('Generación del 27'),
      t('Beat'),
      t('Confesional'),
      t('Exteriorismo'),
      t('Poesía conversacional'),
      t('Neobarroco'),
      t('Poesía de la experiencia'),
    ]),
    t('Contemporáneo', [
      t('Minimalismo'),
      g('Alt lit', 'Literatura nacida en blogs y redes, 2010s'),
      g('Nueva sinceridad', 'Contra la ironía: decirlo en serio'),
      t('Post-internet poetry'),
      t('Poesía documental'),
    ]),
  ]),

  // ── 5 ── ESTÉTICA ───────────────────────────────────────────────────────
  root('Estética', 'Cómo se ve, cómo vibra', [
    t('Abstracto'),
    t('Gótico', [
      t('Southern Gothic'),
      g('Gótico tropical', 'Lo siniestro bajo el calor y la humedad del trópico'),
      t('Whimsigoth'),
      g('Vamp romantic', 'Belleza oscura: terciopelo, uñas negras, velas'),
    ]),
    t('Realismo mágico'),
    g('Académicas', 'Libros, bibliotecas y el deseo de saber', [
      g('Dark academia', 'Bibliotecas, tragedia griega y obsesión intelectual', [
        g('Poetcore', 'Cuello alto, pluma fuente y el ánimo antes que el outfit'),
        t('Chaotic academia'),
      ]),
      t('Light academia'),
      t('Librarian chic'),
    ]),
    g('Naturaleza idílica', 'Volver al campo, aunque sea en la imaginación', [
      g('Cottagecore', 'Vida rural soñada: pan casero, flores, calma', [
        g('Goblincore', 'Musgo, hongos, ranas y cosas encontradas en el suelo', [t('Mushroomcore'), t('Frogcore')]),
        t('Fairycore'),
        t('Grandmillennial'),
      ]),
      g('Mystic outlands', 'Ruinas antiguas y bosques encantados'),
      g('Coastal nothingness', 'Costa sin motivos náuticos: lino, sal y vacío'),
    ]),
    t('Brujería estética', [t('Witchcore'), t('Cottagewitch')]),
    t('Grunge', [t('Soft grunge'), g('Tumblr 2014', 'Pastel grunge, citas sobre fotos y mucho filtro')]),
    g('Retro digital', 'La nostalgia del internet que fue', [
      t('Y2K'),
      g('Frutiger Aero', 'El futuro optimista de 2006: agua, burbujas y cielos azules'),
      t('Vaporwave', [t('Seapunk')]),
      t('Synthwave'),
      g('Webcore', 'Ventanas, cursores y GIFs de la web vieja'),
      t('Indie sleaze'),
    ]),
    t('Futuros', [
      t('Cyberpunk', [g('Tech noir', 'Futuro oscuro, lluvia y neón')]),
      t('Solarpunk'),
      t('Lunarpunk'),
      t('Steampunk'),
    ]),
    g('Lo extraño', 'Lo familiar que de pronto inquieta', [
      g('Weirdcore', 'Imágenes amateur de lugares y textos que no deberían estar ahí', [
        g('Dreamcore', 'La lógica de los sueños hecha imagen'),
        t('Traumacore'),
      ]),
      g('Liminal space', 'Lugares de paso vacíos: pasillos, piscinas, estacionamientos', [
        g('Backrooms', 'El laberinto infinito de oficinas amarillas'),
      ]),
      g('Analog horror', 'Terror en VHS, cintas y transmisiones viejas'),
      g('Hauntology', 'Futuros perdidos que siguen rondando'),
    ]),
    g('Infancia estética', 'La niñez como paleta', [
      t('Kidcore'),
      t('Nostalgiacore'),
      t('Coquette', [t('Balletcore')]),
    ]),
    g('Meta-cores', 'Estéticas sobre las estéticas', [
      g('Corecore', 'Collage de clips sobre la angustia de estar en línea'),
      g('Hopecore', 'Clips que te recuerdan que vale la pena seguir'),
    ]),
  ]),

  // ── 6 ── LUGAR ──────────────────────────────────────────────────────────
  root('Lugar', 'Dónde llueve', [
    t('Latinoamérica', [
      t('Centroamérica', [t('Costa Rica', [g('La Zona', 'Etiqueta local de la comunidad')])]),
      t('Caribe'),
      t('México'),
      t('Andes'),
      t('Cono Sur'),
    ]),
    t('España'),
    t('Lenguas', [t('Spanglish'), t('Lenguas indígenas'), t('Bilingüe')]),
  ]),

  // ── 7 ── TROPOS ─────────────────────────────────────────────────────────
  root('Tropos', 'Patrones que se repiten', [
    g('Clásicos', 'Lugares comunes con siglos de uso', [
      g('Carpe diem', 'Aprovecha el día'),
      g('Memento mori', 'Recuerda que morirás'),
      g('Ubi sunt', '¿Dónde están los que ya no están?'),
      g('Tempus fugit', 'El tiempo huye'),
      g('Locus amoenus', 'El lugar ideal y apacible'),
      g('Beatus ille', 'Dichoso el que vive lejos del ruido'),
      g('Collige virgo rosas', 'Coge las rosas mientras puedas'),
    ]),
    g('Imágenes recurrentes', 'Objetos que la poesía no deja de mirar', [
      g('Cartas que no se envían', 'Escribirle a alguien que nunca lo leerá'),
      t('La ventana'),
      t('El espejo'),
      t('La casa vacía'),
    ]),
    g('De internet', 'Tropos nacidos y nombrados en línea', [
      t('Relaciones', [
        g('Yearning', 'Desear desde lejos, con todo el cuerpo', [g('Mutual pining', 'Los dos se desean y ninguno lo dice')]),
        g('Situationship', 'Algo que no es relación pero tampoco nada', [g('Talking stage', 'La etapa antes de ser algo')]),
        g('The one that got away', 'La persona que se fue y sigue siendo la medida de todo'),
        g('Red string of fate', 'El hilo rojo que une a quienes deben encontrarse'),
        g('Enemies to lovers', 'Del odio al amor'),
      ]),
      t('Identidad en línea', [
        g('Main character energy', 'Vivir como protagonista de la propia película'),
        g('Villain era', 'Dejar de complacer y elegirse'),
        g('Delulu', 'Delirio voluntario y esperanzado'),
        g('NPC', 'Sentirse personaje secundario en el mundo'),
      ]),
      t('Estados en línea', [
        g('3 a.m. thoughts', 'Lo que solo se piensa de madrugada'),
        g('Sad girl autumn', 'Tristeza estética de otoño'),
        g('Girlblogging', 'Diarios íntimos y caóticos en público', [g('Girlhood', 'La niñez y la adolescencia como archivo compartido')]),
        g('Romanticize your life', 'Mirar lo cotidiano como si fuera cine'),
        g('Core memory', 'Un recuerdo que te formó'),
        g('Doomscrolling', 'Bajar y bajar por malas noticias'),
        g('Brainrot', 'La mente saturada de internet'),
        g('Touch grass', 'Salir de la pantalla y tocar el mundo'),
        g('Parasocial', 'Intimidad con alguien que no sabe que existes'),
      ]),
    ]),
  ]),
];

// ── Index (computed once) ──────────────────────────────────────────────────
export type TaxonIndex = {
  bySlug: Map<string, TaxonNode>;
  parentOf: Map<string, string | null>;
  /** slug → node slug, including aliases. */
  canonical: Map<string, string>;
};

function buildIndex(nodes: TaxonNode[]): TaxonIndex {
  const bySlug = new Map<string, TaxonNode>();
  const parentOf = new Map<string, string | null>();
  const canonical = new Map<string, string>();
  const walk = (list: TaxonNode[], parent: string | null) => {
    for (const n of list) {
      if (bySlug.has(n.slug)) throw new Error(`Duplicate taxonomy slug: ${n.slug}`);
      bySlug.set(n.slug, n);
      parentOf.set(n.slug, parent);
      canonical.set(n.slug, n.slug);
      n.aliases?.forEach((a) => canonical.set(a, n.slug));
      walk(n.children, n.slug);
    }
  };
  walk(nodes, null);
  return { bySlug, parentOf, canonical };
}

export const TAXON_INDEX = buildIndex(TAXONOMY);

/** Root → … → node, following canonical slugs (aliases resolve to their node). */
export function pathTo(slug: string): TaxonNode[] {
  const path: TaxonNode[] = [];
  let cur: string | null | undefined = TAXON_INDEX.canonical.get(slug);
  while (cur) {
    const node = TAXON_INDEX.bySlug.get(cur);
    if (!node) break;
    path.unshift(node);
    cur = TAXON_INDEX.parentOf.get(cur);
  }
  return path;
}

/** The node and all its descendants, as tag slugs (aliases included, roots excluded). */
export function subtreeSlugs(node: TaxonNode): string[] {
  const out: string[] = [];
  const walk = (n: TaxonNode) => {
    if (!n.root) out.push(n.slug, ...(n.aliases ?? []));
    n.children.forEach(walk);
  };
  walk(node);
  return out;
}

/** Every tag node in the tree (no roots). */
export function allTagNodes(): TaxonNode[] {
  return [...TAXON_INDEX.bySlug.values()].filter((n) => !n.root);
}

# Taxonomía de etiquetas de Chubascos

> Un árbol para caer hacia adentro: de lo hipergeneral (cómo está hecho, de qué
> trata, cómo se siente) a tropos de internet muy específicos.

Fuente de verdad: `src/data/tagTaxonomy.ts`. Para crear en Firestore las etiquetas
que falten: `npm run seed:taxonomy` (idempotente; `--dry-run` solo reporta).

## Por qué este árbol

Las 93 etiquetas originales vivían en un solo nivel y mezclaban cinco ejes
distintos: forma (soneto), tema (madre), ánimo (melancolía), tradición
(modernismo) y lugar (Costa Rica). En una nube plana, "Soneto" y "Rabia" competían
por la misma atención. Además había duplicados y errores (`poesa`, 15 usos;
`prosa-potica`; `epigrima`).

Las etiquetas se ordenan en **siete raíces ontológicas**. Cada una responde una
pregunta distinta, así que un poema puede llevar etiquetas de varias raíces sin
redundancia:

| Raíz | Pregunta | Llega hasta… |
| --- | --- | --- |
| Forma | ¿Cómo está hecho? | Romance octosílabo, Haibun, Poesía de capturas |
| Tema | ¿De qué trata? | Chubasco, Charco, Inteligencia artificial |
| Ánimo | ¿Cómo se siente? | Anemoia, Kenopsia, Saudade |
| Tradición | ¿De dónde viene? | Estridentismo, Nueva sinceridad, Alt lit |
| Estética | ¿Cómo se ve, cómo vibra? | Mushroomcore, Backrooms, Poetcore |
| Lugar | ¿Dónde llueve? | Costa Rica › La Zona, Spanglish |
| Tropos | ¿Qué patrón repite? | Mutual pining, 3 a.m. thoughts, Talking stage |

Reglas:
- **Las raíces son navegación**, no etiquetas: no se aplican a un poema.
- **Todo lo demás es una etiqueta real** en Firestore (340 en total, hasta 6 niveles).
- **Buscar una etiqueta busca su rama**: "Amor" también encuentra "Desamor",
  "Deseo", "Romance"… Firestore permite 30 etiquetas por consulta, así que la rama
  se ordena por uso y se recorta, siempre con la elegida primero.
- **Los alias** pliegan las etiquetas duplicadas o mal escritas en su nodo
  correcto, sin tocar los poemas existentes.
- **Las estéticas y tropos de internet** conservan el nombre con el que circulan,
  con una glosa en español.

## Criterios de investigación

- **Forma y tradición:** métrica y preceptiva hispánica (arte menor y mayor,
  estrofas, formas fijas), géneros clásicos, y la historia de los movimientos
  desde las jarchas hasta la poesía post-internet y documental.
- **Ánimo:** emociones básicas más *The Dictionary of Obscure Sorrows* (John
  Koenig), que pone nombre a matices muy usados en poesía en línea (sonder,
  anemoia, kenopsia).
- **Estética:** taxonomías de estéticas de internet (sufijos -core, -punk, -wave)
  y las predicciones visuales de 2026. Poetcore es la sucesora literaria de dark
  academia según Pinterest Predicts 2026.
- **Tropos:** lugares comunes clásicos (carpe diem, ubi sunt…) y tropos nacidos
  en línea, sobre todo de BookTok y la cultura de Tumblr y TikTok (yearning,
  situationship, main character energy).
- **Estéticas excluidas:** las ligadas a consumo o moda sin dimensión poética
  (scent stacking, cabbage crush, gimme gummy).

Fuentes: [List of internet aesthetics](https://en.wikipedia.org/wiki/List_of_internet_aesthetics) ·
[Pinterest Predicts 2026](https://nssmag.com/en/lifestyle/43770/pinterest-predicts-2026-aesthetic-trends) ·
[9 internet aesthetics that will define 2026](https://www.gathered.how/news/trends/9-internet-aesthetics-that-will-define-2026) ·
[Tropes and romance on BookTok](https://publishingdegree.co.uk/2025/10/16/tropes-categorize-romance-filtering-a-highly-saturated-market/).

## Para revisar

- `La Zona` (8 usos) quedó en Lugar › Centroamérica › Costa Rica, con la glosa
  "etiqueta local de la comunidad". Si es otra cosa (un colectivo, un evento),
  muévela de rama en `tagTaxonomy.ts`.
- `Romance` (3 usos) quedó como tema amoroso. La forma métrica es
  "Romance octosílabo".

## El árbol completo

### Forma · Cómo está hecho

- Poesía (absorbe: `poesa`)
- Modo — *Los grandes géneros de la palabra*
  - Lírico
  - Narrativo
  - Épico
  - Dramático
    - Poema dramático
    - Monólogo dramático
- Verso — *La línea como unidad*
  - Verso libre
  - Verso medido — *Sílabas contadas*
    - Arte menor
      - Octosílabo
        - Romance octosílabo — *Tirada de octosílabos con rima en los pares*
    - Endecasílabo
    - Alejandrino
  - Estrofas
    - Terceto
    - Cuarteto
    - Lira
    - Décima
    - Copla
    - Seguidilla
  - Formas fijas — *Moldes con reglas heredadas*
    - Soneto
      - Soneto petrarquista
      - Soneto inglés
      - Soneto en verso libre — *Catorce líneas sin métrica*
    - Villanela
    - Sextina
    - Ghazal
    - Pantun
    - Glosa
    - Madrigal
    - Haiku
      - Senryu
      - Tanka
      - Haibun — *Prosa y haiku entrelazados*
- Formas clásicas — *Géneros con siglos de historia*
  - Oda
  - Elegía
  - Égloga
  - Himno
  - Balada
  - Epigrama (absorbe: `epigrima`)
  - Epitafio
  - Albada — *Canto de amantes que se separan al amanecer*
  - Sátira
- Prosa
  - Prosa poética (absorbe: `prosa-potica`)
  - Poema en prosa
  - Microrrelato
  - Aforismo
  - Fragmento
  - Diario
- Visual
  - Poema visual
    - Caligrama
    - Poesía concreta
  - Blackout poetry — *Tachar una página hasta que quede un poema*
    - Erasure poetry
  - Collage
- Voz y escena
  - Slam poetry
    - Spoken word
  - Poesía sonora
  - Canción
  - Recital
- Digital
  - Instapoetry — *Poemas breves pensados para el feed*
    - Poesía en carrusel — *Un poema repartido en diapositivas*
  - Found poetry — *Poemas armados con textos ajenos*
    - Poesía de capturas — *Mensajes, notificaciones y chats como material*
  - Poesía generativa
  - Twitterature — *Poesía en hilos y en 280 caracteres*
- Experimental
  - Oulipo — *Escritura bajo restricciones*
  - Cut-up
  - Antipoesía

### Tema · De qué trata

- Amor
  - Deseo
    - Erotismo
  - Romance — *Relato o vivencia amorosa*
  - Desamor
    - Abandono
    - Ruptura
    - Amor no correspondido
  - Amor propio
  - Amistad
- Cuerpo
  - Salud y enfermedad
    - Salud mental
  - Sexualidad
  - Género
    - Poesía queer
    - Feminismo
- Familia y origen
  - Madre
  - Padre
  - Infancia
  - Abuelos
  - Hermanos
  - Casa
  - Linaje
- Tiempo
  - Memoria
  - Juventud
  - Vejez
  - Estaciones
- Muerte
  - Duelo
  - Fantasmas
- Pensamiento
  - Filosofía
    - Existencialismo
    - Absurdo
    - Nihilismo
    - Metafísica
  - Identidad
  - Metapoesía — *Poemas sobre escribir poemas*
  - Lenguaje
- Lo sagrado
  - Espiritualidad
  - Fe
  - Místico
  - Mitología
  - Brujería
- Naturaleza
  - Lluvia
    - Chubasco
    - Tormenta
    - Charco
  - Mar
  - Noche
  - Animales
  - Plantas
  - Montaña
  - Crisis climática
- Ciudad y mundo
  - Ciudad
  - Mundo
  - Viaje
  - Migración
    - Exilio
    - Diáspora
  - Trabajo
  - Tecnología
    - Internet
    - Inteligencia artificial
- Sociedad
  - Política
    - Resistencia
    - Protesta
    - Memoria histórica
  - Clase social
  - Violencia
  - Colonialismo
- Imaginación
  - Sueños
  - Fantasía

### Ánimo · Cómo se siente

- Luz
  - Alegría
  - Esperanza
  - Gratitud
  - Ternura
  - Asombro
- Quietud
  - Calma
  - Silencio
- Sombra
  - Melancolía
    - Nostalgia
      - Saudade — *Ausencia que se siente presente*
  - Tristeza
  - Soledad
  - Angustia
  - Miedo
  - Rabia
  - Vacío
- Intensidad
  - Íntimo
  - Éxtasis
  - Delirio
- Humor
  - Lúdico
  - Irónico
  - Satírico
  - Humor absurdo — *Risa que nace del sinsentido*
- Penas oscuras — *Emociones sin nombre, nombradas por The Dictionary of Obscure Sorrows*
  - Sonder — *Darte cuenta de que cada desconocido vive una vida tan compleja como la tuya*
  - Anemoia — *Nostalgia por una época que nunca viviste*
  - Kenopsia — *La extrañeza de un lugar habitado, ahora vacío*
  - Vellichor — *La melancolía de las librerías de viejo*
  - Opia — *La intensidad de mirar a alguien a los ojos*
  - Monachopsis — *Sentir que no perteneces a donde estás*
  - Exulansis — *Dejar de contar algo porque nadie lo entiende*

### Tradición · De dónde viene

- Lírica antigua y medieval
  - Jarchas — *Las primeras cancioncillas en romance*
  - Trovadores
  - Amor cortés
- Siglo de Oro
  - Renacimiento
  - Barroco
    - Conceptismo
    - Culteranismo
- Siglo XIX
  - Romántico
  - Simbolismo
  - Parnasianismo
  - Modernismo
- Vanguardia
  - Surrealismo
  - Dadaísmo
  - Creacionismo
  - Ultraísmo
  - Estridentismo
  - Futurismo
- Siglo XX
  - Generación del 27
  - Beat
  - Confesional
  - Exteriorismo
  - Poesía conversacional
  - Neobarroco
  - Poesía de la experiencia
- Contemporáneo
  - Minimalismo
  - Alt lit — *Literatura nacida en blogs y redes, 2010s*
  - Nueva sinceridad — *Contra la ironía: decirlo en serio*
  - Post-internet poetry
  - Poesía documental

### Estética · Cómo se ve, cómo vibra

- Abstracto
- Gótico
  - Southern Gothic
  - Gótico tropical — *Lo siniestro bajo el calor y la humedad del trópico*
  - Whimsigoth
  - Vamp romantic — *Belleza oscura: terciopelo, uñas negras, velas*
- Realismo mágico
- Académicas — *Libros, bibliotecas y el deseo de saber*
  - Dark academia — *Bibliotecas, tragedia griega y obsesión intelectual*
    - Poetcore — *Cuello alto, pluma fuente y el ánimo antes que el outfit*
    - Chaotic academia
  - Light academia
  - Librarian chic
- Naturaleza idílica — *Volver al campo, aunque sea en la imaginación*
  - Cottagecore — *Vida rural soñada: pan casero, flores, calma*
    - Goblincore — *Musgo, hongos, ranas y cosas encontradas en el suelo*
      - Mushroomcore
      - Frogcore
    - Fairycore
    - Grandmillennial
  - Mystic outlands — *Ruinas antiguas y bosques encantados*
  - Coastal nothingness — *Costa sin motivos náuticos: lino, sal y vacío*
- Brujería estética
  - Witchcore
  - Cottagewitch
- Grunge
  - Soft grunge
  - Tumblr 2014 — *Pastel grunge, citas sobre fotos y mucho filtro*
- Retro digital — *La nostalgia del internet que fue*
  - Y2K
  - Frutiger Aero — *El futuro optimista de 2006: agua, burbujas y cielos azules*
  - Vaporwave
    - Seapunk
  - Synthwave
  - Webcore — *Ventanas, cursores y GIFs de la web vieja*
  - Indie sleaze
- Futuros
  - Cyberpunk
    - Tech noir — *Futuro oscuro, lluvia y neón*
  - Solarpunk
  - Lunarpunk
  - Steampunk
- Lo extraño — *Lo familiar que de pronto inquieta*
  - Weirdcore — *Imágenes amateur de lugares y textos que no deberían estar ahí*
    - Dreamcore — *La lógica de los sueños hecha imagen*
    - Traumacore
  - Liminal space — *Lugares de paso vacíos: pasillos, piscinas, estacionamientos*
    - Backrooms — *El laberinto infinito de oficinas amarillas*
  - Analog horror — *Terror en VHS, cintas y transmisiones viejas*
  - Hauntology — *Futuros perdidos que siguen rondando*
- Infancia estética — *La niñez como paleta*
  - Kidcore
  - Nostalgiacore
  - Coquette
    - Balletcore
- Meta-cores — *Estéticas sobre las estéticas*
  - Corecore — *Collage de clips sobre la angustia de estar en línea*
  - Hopecore — *Clips que te recuerdan que vale la pena seguir*

### Lugar · Dónde llueve

- Latinoamérica
  - Centroamérica
    - Costa Rica
      - La Zona — *Etiqueta local de la comunidad*
  - Caribe
  - México
  - Andes
  - Cono Sur
- España
- Lenguas
  - Spanglish
  - Lenguas indígenas
  - Bilingüe

### Tropos · Patrones que se repiten

- Clásicos — *Lugares comunes con siglos de uso*
  - Carpe diem — *Aprovecha el día*
  - Memento mori — *Recuerda que morirás*
  - Ubi sunt — *¿Dónde están los que ya no están?*
  - Tempus fugit — *El tiempo huye*
  - Locus amoenus — *El lugar ideal y apacible*
  - Beatus ille — *Dichoso el que vive lejos del ruido*
  - Collige virgo rosas — *Coge las rosas mientras puedas*
- Imágenes recurrentes — *Objetos que la poesía no deja de mirar*
  - Cartas que no se envían — *Escribirle a alguien que nunca lo leerá*
  - La ventana
  - El espejo
  - La casa vacía
- De internet — *Tropos nacidos y nombrados en línea*
  - Relaciones
    - Yearning — *Desear desde lejos, con todo el cuerpo*
      - Mutual pining — *Los dos se desean y ninguno lo dice*
    - Situationship — *Algo que no es relación pero tampoco nada*
      - Talking stage — *La etapa antes de ser algo*
    - The one that got away — *La persona que se fue y sigue siendo la medida de todo*
    - Red string of fate — *El hilo rojo que une a quienes deben encontrarse*
    - Enemies to lovers — *Del odio al amor*
  - Identidad en línea
    - Main character energy — *Vivir como protagonista de la propia película*
    - Villain era — *Dejar de complacer y elegirse*
    - Delulu — *Delirio voluntario y esperanzado*
    - NPC — *Sentirse personaje secundario en el mundo*
  - Estados en línea
    - 3 a.m. thoughts — *Lo que solo se piensa de madrugada*
    - Sad girl autumn — *Tristeza estética de otoño*
    - Girlblogging — *Diarios íntimos y caóticos en público*
      - Girlhood — *La niñez y la adolescencia como archivo compartido*
    - Romanticize your life — *Mirar lo cotidiano como si fuera cine*
    - Core memory — *Un recuerdo que te formó*
    - Doomscrolling — *Bajar y bajar por malas noticias*
    - Brainrot — *La mente saturada de internet*
    - Touch grass — *Salir de la pantalla y tocar el mundo*
    - Parasocial — *Intimidad con alguien que no sabe que existes*

## Voces afines (afinidad por etiquetas)

`src/lib/affinity.ts` convierte las etiquetas de los poemas y libros de cada autor (más, con medio peso, las etiquetas de su perfil) en un perfil sobre el árbol:

1. Cada obra reparte una unidad de peso entre sus etiquetas.
2. Cada etiqueta cede la mitad a su padre, un cuarto al abuelo… (las raíces no cuentan), así «Desamor» y «Mutual pining» se encuentran en «Amor».
3. El perfil se promedia por obra: describe qué escribe alguien, no cuánto.
4. Cada dimensión se pondera por su rareza entre autores (IDF): lo que todos usan dice poco.

La afinidad es el coseno entre perfiles (mínimo 0,12; hasta 6 voces). «Comparten» muestra las tres etiquetas que más aportan, sin repetir una etiqueta y su propio ancestro. Se calcula para todos a la vez en `actions/data/affinity.ts` (caché de 10 min) y se muestra en el perfil público y en el riel del taller.

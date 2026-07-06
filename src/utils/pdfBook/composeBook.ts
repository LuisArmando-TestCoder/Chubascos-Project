// Composes a BookLayout into an array of backend-agnostic PageDescriptors.
// This is the single source of truth for how every page looks; both the PDF
// writer and the on-screen preview consume the exact same descriptors.

import type { BookLayout, ContentPage } from './types';
import type { PageDescriptor, PageElement, FontStyle } from './pageModel';
import { PAGE, CONTENT, FONT, LEADING, COLORS } from './geometry';
import { wrapLine, type Measurer } from './textMeasure';

export type MeasurerFactory = (size: number, style?: FontStyle) => Measurer;

const TOC_NUMBER_COLUMN = 34;

// Accumulator that builds pages sequentially.
class Composer {
  pages: PageDescriptor[] = [];
  private cur: PageElement[] = [];

  text(
    text: string,
    x: number,
    y: number,
    size: number,
    style: FontStyle,
    color: string,
    align: 'left' | 'center' | 'right' = 'left'
  ) {
    if (text !== '') this.cur.push({ kind: 'text', text, x, y, size, style, color, align });
  }

  image(dataUrl: string, x: number, y: number, w: number, h: number) {
    this.cur.push({ kind: 'image', dataUrl, x, y, w, h });
  }

  rule(x1: number, y1: number, x2: number, y2: number, width: number, color: string, dashed = false) {
    this.cur.push({ kind: 'rule', x1, y1, x2, y2, width, color, dashed });
  }

  link(x: number, y: number, w: number, h: number, target: { pageNumber?: number; url?: string }) {
    this.cur.push({ kind: 'link', x, y, w, h, ...target });
  }

  // Finalize the current page and start a new blank one.
  break() {
    this.pages.push({ elements: this.cur });
    this.cur = [];
  }

  finish(): PageDescriptor[] {
    this.pages.push({ elements: this.cur });
    return this.pages;
  }
}

function folio(c: Composer, pageNumber: number) {
  c.text(String(pageNumber), PAGE.width / 2, PAGE.height - 34, FONT.footer, 'normal', COLORS.faint, 'center');
}

// ---- Cover ----
function composeCover(c: Composer, layout: BookLayout, makeMeasurer: MeasurerFactory) {
  const cx = PAGE.width / 2;
  c.text('ANTOLOGÍA POÉTICA', cx, PAGE.height * 0.32, FONT.coverSubtitle, 'normal', COLORS.soft, 'center');

  const titleMeasure = makeMeasurer(FONT.coverTitle, 'bold');
  const titleLines = wrapLine(layout.bookTitle, CONTENT.width, titleMeasure);
  let ty = PAGE.height * 0.42;
  for (const line of titleLines) {
    c.text(line, cx, ty, FONT.coverTitle, 'bold', COLORS.ink, 'center');
    ty += FONT.coverTitle * 1.15;
  }

  c.rule(cx - 40, ty + 6, cx + 40, ty + 6, 0.5, COLORS.rule);
  c.text(layout.authorName, cx, ty + 30, FONT.coverSubtitle, 'italic', COLORS.soft, 'center');

  const count = layout.poems.length;
  const countLabel = count === 1 ? '1 poema' : `${count} poemas`;
  c.text(countLabel, cx, PAGE.height * 0.86, FONT.coverMeta, 'normal', COLORS.faint, 'center');
}

// ---- Copyright ----
function composeCopyright(c: Composer, layout: BookLayout) {
  const x = CONTENT.x;
  let y = CONTENT.y + 40;

  c.text(layout.bookTitle, x, y, FONT.copyrightHeading, 'bold', COLORS.ink);
  y += FONT.copyrightHeading * 1.6;

  const lines = [
    `© ${layout.year} ${layout.copyrightHolder}`,
    '',
    'Todos los derechos reservados. Ninguna parte de esta obra puede ser',
    'reproducida, distribuida o transmitida en cualquier forma o por cualquier',
    'medio sin el permiso previo por escrito del autor, salvo citas breves',
    'incorporadas en reseñas y usos permitidos por la ley de derechos de autor.',
    '',
    `Autor: ${layout.authorName}`,
    '',
    'Compilado y generado digitalmente en Chubascos.',
    `Perfil del poeta: ${layout.profileUrl}`,
    `Fecha de generación: ${new Date().toLocaleDateString('es-CR')}`,
  ];

  const lh = FONT.copyrightBody * LEADING.prose;
  for (const line of lines) {
    if (line === '') {
      y += lh * 0.6;
      continue;
    }
    c.text(line, x, y, FONT.copyrightBody, 'normal', COLORS.soft);
    y += lh;
  }
}

// ---- Bio ----
function composeBio(c: Composer, layout: BookLayout, startPageNumber: number) {
  layout.bioPages.forEach((page: ContentPage, i) => {
    if (i > 0) c.break();
    let headingBottom = CONTENT.y;
    if (i === 0) {
      c.text('Sobre el autor', CONTENT.x, CONTENT.y + FONT.bioHeading, FONT.bioHeading, 'bold', COLORS.ink);
      headingBottom = CONTENT.y + FONT.bioHeading * 2.2;
    }

    for (const line of page.lines) {
      if (line.text === '') continue;
      c.text(line.text, CONTENT.x, headingBottom + line.y + FONT.bioBody, FONT.bioBody, 'normal', COLORS.soft);
    }

    if (i === layout.bioPages.length - 1 && layout.contacts && layout.contacts.length > 0) {
      const lh = FONT.bioBody * LEADING.prose;
      let cy = headingBottom + page.lines.length * lh + lh;
      if (cy < CONTENT.y + CONTENT.height - lh * 2) {
        c.text('Canales', CONTENT.x, cy, FONT.bioBody, 'bold', COLORS.ink);
        cy += lh;
        for (const contact of layout.contacts) {
          if (cy > CONTENT.y + CONTENT.height) break;
          c.text(`${contact.label} — ${contact.url}`, CONTENT.x, cy, FONT.bioBody, 'normal', COLORS.soft);
          cy += lh;
        }
      }
    }

    folio(c, startPageNumber + i);
  });
}

// ---- Índice ----
function composeToc(c: Composer, layout: BookLayout, startPageNumber: number, makeMeasurer: MeasurerFactory) {
  const titleMaxWidth = CONTENT.width - TOC_NUMBER_COLUMN;
  const entryLineHeight = FONT.tocEntry * LEADING.toc;
  const tocMeasure = makeMeasurer(FONT.tocEntry, 'normal');

  let pageIndex = 0;
  const headingTop = CONTENT.y + FONT.tocHeading * 2.2;
  let y = headingTop;
  c.text('Índice', CONTENT.x, CONTENT.y + FONT.tocHeading, FONT.tocHeading, 'bold', COLORS.ink);

  const pageLimit = CONTENT.y + CONTENT.height;

  for (const entry of layout.tocEntries) {
    const titleLines = wrapLine(entry.title, titleMaxWidth, tocMeasure);
    const blockHeight = titleLines.length * entryLineHeight + entryLineHeight * 0.35;

    if (y + blockHeight > pageLimit && y > headingTop) {
      folio(c, startPageNumber + pageIndex);
      c.break();
      pageIndex += 1;
      y = CONTENT.y;
    }

    const rowTop = y;
    let ly = y + FONT.tocEntry;
    for (const tl of titleLines) {
      c.text(tl, CONTENT.x, ly, FONT.tocEntry, 'normal', COLORS.ink);
      ly += entryLineHeight;
    }

    const numY = y + FONT.tocEntry;
    c.text(String(entry.pageNumber), CONTENT.x + CONTENT.width, numY, FONT.tocEntry, 'normal', COLORS.soft, 'right');

    const firstLineWidth = tocMeasure(titleLines[0]);
    const leaderStart = CONTENT.x + firstLineWidth + 6;
    const leaderEnd = CONTENT.x + CONTENT.width - TOC_NUMBER_COLUMN;
    if (leaderEnd > leaderStart) {
      c.rule(leaderStart, numY - 2, leaderEnd, numY - 2, 0.3, COLORS.rule, true);
    }

    const rowHeight = titleLines.length * entryLineHeight;
    c.link(CONTENT.x, rowTop, CONTENT.width, rowHeight, { pageNumber: entry.pageNumber });

    y += blockHeight;
  }

  folio(c, startPageNumber + pageIndex);
}

// ---- Poem title page ----
function composePoemTitle(c: Composer, title: string, index: number, pageNumber: number, makeMeasurer: MeasurerFactory) {
  const cx = PAGE.width / 2;
  c.text(String(index + 1).padStart(2, '0'), cx, PAGE.height * 0.4, FONT.poemNumber, 'normal', COLORS.faint, 'center');

  const titleMeasure = makeMeasurer(FONT.poemTitlePage, 'bold');
  const titleLines = wrapLine(title, CONTENT.width, titleMeasure);
  let ty = PAGE.height * 0.47;
  for (const line of titleLines) {
    c.text(line, cx, ty, FONT.poemTitlePage, 'bold', COLORS.ink, 'center');
    ty += FONT.poemTitlePage * 1.2;
  }
  folio(c, pageNumber);
}

// ---- Poem content page ----
function composePoemContent(c: Composer, page: ContentPage, pageNumber: number) {
  for (const line of page.lines) {
    if (line.text === '') continue;
    c.text(line.text, CONTENT.x, CONTENT.y + line.y + FONT.verse, FONT.verse, 'normal', COLORS.ink);
  }
  folio(c, pageNumber);
}

// ---- QR final page ----
function composeQr(c: Composer, layout: BookLayout, qrDataUrl: string, pageNumber: number) {
  const cx = PAGE.width / 2;
  const qrSize = 150;
  const qrX = cx - qrSize / 2;
  const qrY = PAGE.height * 0.3;

  c.text('Descubre más en el perfil del poeta', cx, qrY - 20, FONT.qrCaption, 'normal', COLORS.soft, 'center');
  c.image(qrDataUrl, qrX, qrY, qrSize, qrSize);
  c.link(qrX, qrY, qrSize, qrSize, { url: layout.profileUrl });
  c.text(layout.profileUrl, cx, qrY + qrSize + 26, FONT.qrCaption, 'normal', COLORS.faint, 'center');
  c.link(cx - 100, qrY + qrSize + 16, 200, 16, { url: layout.profileUrl });
  c.text(layout.authorName, cx, PAGE.height * 0.86, FONT.coverMeta, 'italic', COLORS.soft, 'center');
  folio(c, pageNumber);
}

// ---- Orchestrator ----
export function composeBookPages(
  layout: BookLayout,
  makeMeasurer: MeasurerFactory,
  qrDataUrl: string
): PageDescriptor[] {
  const c = new Composer();

  composeCover(c, layout, makeMeasurer);

  c.break();
  composeCopyright(c, layout);

  let pageCursor = layout.coverPages + layout.copyrightPages;
  if (layout.bioPages.length > 0) {
    c.break();
    composeBio(c, layout, pageCursor + 1);
    pageCursor += layout.bioPages.length;
  }

  c.break();
  composeToc(c, layout, pageCursor + 1, makeMeasurer);
  pageCursor += layout.tocPages;

  for (const poem of layout.poems) {
    c.break();
    composePoemTitle(c, poem.title, poem.index, poem.titlePageNumber, makeMeasurer);
    let pn = poem.titlePageNumber;
    for (const page of poem.pages) {
      c.break();
      pn += 1;
      composePoemContent(c, page, pn);
    }
  }

  c.break();
  composeQr(c, layout, qrDataUrl, layout.qrPageNumber);

  return c.finish();
}

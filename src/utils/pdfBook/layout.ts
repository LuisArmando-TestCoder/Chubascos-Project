// The two-pass layout engine.
//
// Pass 1 (measure): paginate the bio and every poem body against the page
// geometry to learn how many pages each occupies — without yet knowing absolute
// page numbers.
//
// Then: derive the índice (table of contents) page count. The TOC's own length
// depends only on how many poems there are and how their titles wrap, NOT on
// the page numbers printed beside them (1–3 digit numbers don't change the
// wrapping since a fixed number column is reserved). So there is no circular
// dependency.
//
// Pass 2 (resolve): walk a cursor forward through the fixed front matter and
// each poem (title page + content pages) to assign every poem its absolute
// title-page number, then place the final QR page.

import type { BookInput, BookLayout, PoemLayout, TocEntry, ContentPage } from './types';
import { CONTENT, FONT, LEADING } from './geometry';
import { paginateProse } from './paginateProse';
import { paginateVerse } from './paginateVerse';
import { wrapLine, type Measurer } from './textMeasure';

// A factory that yields a measurer bound to a given font size/style. The
// implementation (backed by jsPDF) is provided by the caller so this module
// carries no rendering dependency.
export type MeasurerFactory = (size: number, style?: 'normal' | 'bold' | 'italic') => Measurer;

// Width reserved on the right of a TOC row for the page-number column.
const TOC_NUMBER_COLUMN = 34;

// Compute how many visual lines each TOC entry title occupies, and the total
// number of TOC pages. Kept deterministic so the renderer reproduces it exactly.
export function computeTocLineCounts(
  titles: string[],
  measure: Measurer
): number[] {
  const titleMaxWidth = CONTENT.width - TOC_NUMBER_COLUMN;
  return titles.map((t) => wrapLine(t, titleMaxWidth, measure).length);
}

function computeTocPages(lineCounts: number[]): number {
  const entryLineHeight = FONT.tocEntry * LEADING.toc;
  const headingBlock = FONT.tocHeading * 2.2; // heading + spacing on first page
  const firstPageHeight = CONTENT.height - headingBlock;
  const otherPageHeight = CONTENT.height;

  let pages = 1;
  let y = 0;
  let firstPage = true;

  for (const count of lineCounts) {
    const blockHeight = count * entryLineHeight + entryLineHeight * 0.35; // row + gap
    const limit = firstPage ? firstPageHeight : otherPageHeight;
    if (y + blockHeight > limit && y > 0) {
      pages += 1;
      y = 0;
      firstPage = false;
    }
    y += blockHeight;
  }
  return pages;
}

export function computeBookLayout(
  input: BookInput,
  makeMeasurer: MeasurerFactory
): BookLayout {
  const year = input.year ?? new Date().getFullYear();
  const bookTitle = input.bookTitle?.trim() || input.authorName;
  const copyrightHolder = input.copyrightHolder?.trim() || input.authorName;

  // --- Pass 1: paginate bio ---
  let bioPages: ContentPage[] = [];
  if (input.bio && input.bio.trim()) {
    const bioMeasure = makeMeasurer(FONT.bioBody, 'normal');
    bioPages = paginateProse(input.bio.trim(), bioMeasure, {
      maxWidth: CONTENT.width,
      maxHeight: CONTENT.height - FONT.bioHeading * 2.2,
      lineHeight: FONT.bioBody * LEADING.prose,
      paragraphGap: FONT.bioBody * 0.7,
    });
  }

  // --- Pass 1: paginate each poem body ---
  const verseMeasure = makeMeasurer(FONT.verse, 'normal');
  const poemPageSets: ContentPage[][] = input.poems.map((poem) =>
    paginateVerse(poem.content, verseMeasure, {
      maxWidth: CONTENT.width,
      maxHeight: CONTENT.height,
      lineHeight: FONT.verse * LEADING.verse,
      stanzaGap: FONT.stanzaGap,
    })
  );

  // --- TOC sizing ---
  const tocMeasure = makeMeasurer(FONT.tocEntry, 'normal');
  const tocLineCounts = computeTocLineCounts(
    input.poems.map((p) => p.title),
    tocMeasure
  );
  const tocPages = computeTocPages(tocLineCounts);

  // --- Pass 2: resolve absolute page numbers ---
  // Front matter: cover (1) + copyright (1) + bio pages + toc pages.
  const coverPages = 1;
  const copyrightPages = 1;
  let cursor = coverPages + copyrightPages + bioPages.length + tocPages; // pages consumed so far

  const poems: PoemLayout[] = [];
  const tocEntries: TocEntry[] = [];

  for (let i = 0; i < input.poems.length; i++) {
    const titlePageNumber = cursor + 1; // next page is this poem's title page
    poems.push({
      title: input.poems[i].title,
      titlePageNumber,
      pages: poemPageSets[i],
      index: i,
    });
    tocEntries.push({ title: input.poems[i].title, pageNumber: titlePageNumber });

    // Consume: 1 title page + N content pages.
    cursor += 1 + poemPageSets[i].length;
  }

  const qrPageNumber = cursor + 1;
  const totalPages = qrPageNumber;

  return {
    bookTitle,
    authorName: input.authorName,
    copyrightHolder,
    year,
    profileUrl: input.profileUrl,
    bio: input.bio && input.bio.trim() ? input.bio.trim() : undefined,
    contacts: input.contacts,
    coverPages,
    copyrightPages,
    bioPages,
    tocPages,
    tocEntries,
    poems,
    qrPageNumber,
    totalPages,
  };
}

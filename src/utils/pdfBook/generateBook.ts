// Public entry points for the poem-book PDF pipeline.
//
//  - composePoemBook(): does the heavy work (layout + QR + page composition)
//    and returns backend-agnostic PageDescriptors plus a filename. The preview
//    UI streams these descriptors to the screen.
//  - downloadComposedBook(): turns already-composed descriptors into a jsPDF
//    file and saves it (fast; no re-layout).
//  - generatePoemBookPdf(): convenience one-shot compose + download.

import { jsPDF } from 'jspdf';
import { FONT_FAMILY } from './geometry';
import { computeBookLayout } from './layout';
import { composeBookPages, type MeasurerFactory } from './composeBook';
import { drawPagesToPdf } from './drawToPdf';
import { generateQrDataUrl } from './qrImage';
import type { BookInput } from './types';
import type { PageDescriptor } from './pageModel';
import type { Measurer } from './textMeasure';

// Light markdown stripping that PRESERVES line breaks (crucial for verse).
function stripMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '') // bullet markers
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // inline/code fences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → keep text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/^\s*([-*_]\s*){3,}$/gm, '') // horizontal rules
    .replace(/[ \t]+$/gm, '') // trailing spaces
    .trim();
}

function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'poemario'
  );
}

export interface GeneratePoemBookOptions {
  authorName: string;
  bio?: string;
  contacts?: { label: string; url: string }[];
  poems: { title: string; content: string }[];
  profileUrl: string;
  bookTitle?: string;
  copyrightHolder?: string;
}

export interface ComposedBook {
  pages: PageDescriptor[];
  filename: string;
}

// A measurer factory backed by a throwaway jsPDF used purely for text metrics.
function makeMeasurerFactory(doc: jsPDF): MeasurerFactory {
  return (size, style = 'normal'): Measurer =>
    (text: string) => {
      doc.setFont(FONT_FAMILY, style);
      doc.setFontSize(size);
      return doc.getTextWidth(text);
    };
}

export async function composePoemBook(options: GeneratePoemBookOptions): Promise<ComposedBook> {
  if (!options.poems || options.poems.length === 0) {
    throw new Error('No hay poemas para incluir en el libro.');
  }

  // Measurement-only document (never saved).
  const measureDoc = new jsPDF({ unit: 'pt', format: 'a5', orientation: 'portrait' });
  measureDoc.setFont(FONT_FAMILY, 'normal');
  const makeMeasurer = makeMeasurerFactory(measureDoc);

  const input: BookInput = {
    authorName: options.authorName,
    bio: options.bio,
    contacts: options.contacts,
    profileUrl: options.profileUrl,
    bookTitle: options.bookTitle,
    copyrightHolder: options.copyrightHolder,
    poems: options.poems.map((p) => ({
      title: p.title.trim(),
      content: stripMarkdown(p.content || ''),
    })),
  };

  const layout = computeBookLayout(input, makeMeasurer);
  const qrDataUrl = await generateQrDataUrl(options.profileUrl);
  const pages = composeBookPages(layout, makeMeasurer, qrDataUrl);

  const filename = `${slugifyFilename(input.bookTitle || input.authorName)}-poemario.pdf`;
  return { pages, filename };
}

export function downloadComposedBook(pages: PageDescriptor[], filename: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a5', orientation: 'portrait' });
  doc.setFont(FONT_FAMILY, 'normal');
  drawPagesToPdf(doc, pages);
  doc.save(filename);
}

export async function generatePoemBookPdf(options: GeneratePoemBookOptions): Promise<void> {
  const { pages, filename } = await composePoemBook(options);
  downloadComposedBook(pages, filename);
}

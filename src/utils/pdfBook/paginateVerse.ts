// Paginates a poem's body into pages, treating poetry differently from prose:
//
//  - A single "\n" is a hard verse-line break and is preserved literally.
//  - A blank line separates stanzas (adds vertical breathing room).
//  - A verse line only soft-wraps if it is physically too wide for the box; the
//    wrap is orphan-word rebalanced so no lonely word is stranded.
//  - Whole stanzas are kept together across page breaks (widow/orphan control).
//    A stanza is only split when it is taller than a full page, and even then
//    the splitter refuses to leave fewer than MIN_LINES_AT_BREAK lines on
//    either side of the break.

import type { ContentPage, LaidLine } from './types';
import { wrapLine, type Measurer } from './textMeasure';
import { MIN_LINES_AT_BREAK } from './geometry';

export interface VerseOptions {
  maxWidth: number;
  maxHeight: number;
  lineHeight: number; // points per verse line
  stanzaGap: number; // extra points between stanzas
}

interface Stanza {
  lines: string[]; // visual (already wrapped) lines
}

function buildStanzas(text: string, maxWidth: number, measure: Measurer): Stanza[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const rawStanzas = normalized.split(/\n{2,}/);

  const stanzas: Stanza[] = [];
  for (const raw of rawStanzas) {
    const verseLines = raw.split('\n').map((l) => l.replace(/[ \t]+$/g, ''));
    const visual: string[] = [];
    for (const vl of verseLines) {
      if (vl.trim() === '') {
        visual.push('');
        continue;
      }
      // Soft-wrap only if the verse line exceeds the box width.
      if (measure(vl.trim()) <= maxWidth) {
        visual.push(vl.trim());
      } else {
        const wrapped = wrapLine(vl.trim(), maxWidth, measure);
        visual.push(...wrapped);
      }
    }
    if (visual.length > 0) stanzas.push({ lines: visual });
  }
  return stanzas;
}

export function paginateVerse(
  text: string,
  measure: Measurer,
  opts: VerseOptions
): ContentPage[] {
  const { maxWidth, maxHeight, lineHeight, stanzaGap } = opts;
  const linesPerPage = Math.max(1, Math.floor(maxHeight / lineHeight));
  const stanzas = buildStanzas(text, maxWidth, measure);

  const pages: ContentPage[] = [];
  let current: LaidLine[] = [];
  let cursorY = 0;

  const remainingLines = () => Math.floor((maxHeight - cursorY) / lineHeight);

  const pushPage = () => {
    pages.push({ lines: current });
    current = [];
    cursorY = 0;
  };

  const placeLines = (lines: string[], stanzaStart: boolean) => {
    for (let i = 0; i < lines.length; i++) {
      current.push({
        text: lines[i],
        y: cursorY,
        isStanzaStart: stanzaStart && i === 0,
      });
      cursorY += lineHeight;
    }
  };

  for (let s = 0; s < stanzas.length; s++) {
    const stanza = stanzas[s];
    const need = stanza.lines.length;

    // Add stanza gap if this is not the first block on the page.
    if (current.length > 0) {
      cursorY += stanzaGap;
    }

    if (remainingLines() >= need) {
      // Whole stanza fits on the current page.
      placeLines(stanza.lines, true);
      continue;
    }

    if (need <= linesPerPage) {
      // Stanza fits on a page by itself → move it wholesale to a fresh page.
      if (current.length > 0) pushPage();
      placeLines(stanza.lines, true);
      continue;
    }

    // Stanza is taller than a full page → split with widow/orphan protection.
    let offset = 0;
    let first = true;
    while (offset < stanza.lines.length) {
      if (current.length > 0 && remainingLines() < MIN_LINES_AT_BREAK && !first) {
        pushPage();
      }
      let capacity = remainingLines();
      const left = stanza.lines.length - offset;

      // Avoid leaving a tiny widow on the NEXT page: if taking `capacity` lines
      // would strand fewer than MIN_LINES_AT_BREAK, pull back a couple lines.
      if (left - capacity > 0 && left - capacity < MIN_LINES_AT_BREAK) {
        capacity = Math.max(MIN_LINES_AT_BREAK, left - MIN_LINES_AT_BREAK);
      }
      capacity = Math.min(capacity, left);
      if (capacity <= 0) {
        pushPage();
        continue;
      }

      const chunk = stanza.lines.slice(offset, offset + capacity);
      placeLines(chunk, first);
      offset += capacity;
      first = false;

      if (offset < stanza.lines.length) {
        pushPage();
      }
    }
  }

  if (current.length > 0) pushPage();
  return pages.length > 0 ? pages : [{ lines: [] }];
}

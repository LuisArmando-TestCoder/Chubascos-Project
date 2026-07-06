// Paginates flowing prose (the author bio, copyright body) into pages that fit
// the content box. Paragraphs are separated by blank lines; each paragraph is
// word-wrapped with orphan-word rebalancing, then lines flow across pages.

import type { ContentPage, LaidLine } from './types';
import { wrapParagraph, type Measurer } from './textMeasure';

export interface ProseOptions {
  maxWidth: number;
  maxHeight: number;
  lineHeight: number; // points per line
  paragraphGap: number; // extra points between paragraphs
}

export function paginateProse(
  text: string,
  measure: Measurer,
  opts: ProseOptions
): ContentPage[] {
  const { maxWidth, maxHeight, lineHeight, paragraphGap } = opts;

  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  const pages: ContentPage[] = [];
  let current: LaidLine[] = [];
  let cursorY = 0;

  const pushPage = () => {
    if (current.length > 0) {
      pages.push({ lines: current });
      current = [];
      cursorY = 0;
    }
  };

  for (let p = 0; p < paragraphs.length; p++) {
    const lines = wrapParagraph(paragraphs[p], maxWidth, measure);

    for (let i = 0; i < lines.length; i++) {
      if (cursorY + lineHeight > maxHeight && current.length > 0) {
        pushPage();
      }
      current.push({
        text: lines[i],
        y: cursorY,
        isStanzaStart: i === 0,
      });
      cursorY += lineHeight;
    }

    // Paragraph gap (not after the final paragraph).
    if (p < paragraphs.length - 1) {
      cursorY += paragraphGap;
    }
  }

  pushPage();
  return pages.length > 0 ? pages : [{ lines: [] }];
}

// Text wrapping with orphan-word rebalancing.
//
// A "measurer" abstracts jsPDF's getTextWidth so this module stays testable and
// free of any direct jsPDF dependency. The measurer must already have the
// correct font + size selected on the document before wrapping is requested.

export type Measurer = (text: string) => number;

// Collapse runs of inline whitespace but preserve the meaningful content.
function normalizeInline(text: string): string {
  return text.replace(/[ \t]+/g, ' ').trim();
}

// Greedy word wrap: break a single logical line into visual lines that each fit
// within maxWidth. Words longer than maxWidth are hard-broken by character.
function greedyWrap(text: string, maxWidth: number, measure: Measurer): string[] {
  const words = normalizeInline(text).split(' ').filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth || current === '') {
      // If a single word is wider than the box, hard-break it.
      if (current === '' && measure(word) > maxWidth) {
        const pieces = hardBreakWord(word, maxWidth, measure);
        // All but the last piece are complete lines.
        for (let i = 0; i < pieces.length - 1; i++) lines.push(pieces[i]);
        current = pieces[pieces.length - 1];
      } else {
        current = candidate;
      }
    } else {
      lines.push(current);
      current = word;
      if (measure(word) > maxWidth) {
        const pieces = hardBreakWord(word, maxWidth, measure);
        for (let i = 0; i < pieces.length - 1; i++) lines.push(pieces[i]);
        current = pieces[pieces.length - 1];
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Break an over-long word into chunks that each fit within maxWidth.
function hardBreakWord(word: string, maxWidth: number, measure: Measurer): string[] {
  const chunks: string[] = [];
  let chunk = '';
  for (const ch of word) {
    const candidate = chunk + ch;
    if (measure(candidate) <= maxWidth || chunk === '') {
      chunk = candidate;
    } else {
      chunks.push(chunk);
      chunk = ch;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

// Rebalance the LAST line of a wrapped paragraph so it isn't a lonely short
// "orphan" word. If the last visual line holds a single short word, pull a word
// down from the previous line so the break looks intentional. This never
// produces a line that overflows maxWidth.
function rebalanceOrphan(lines: string[], maxWidth: number, measure: Measurer): string[] {
  if (lines.length < 2) return lines;

  const last = lines[lines.length - 1];
  const lastWords = last.split(' ').filter(Boolean);

  // Only act on a true orphan: a final line made of exactly one word.
  if (lastWords.length !== 1) return lines;

  const prev = lines[lines.length - 2];
  const prevWords = prev.split(' ').filter(Boolean);
  if (prevWords.length < 2) return lines; // can't borrow without emptying prev

  const borrowed = prevWords[prevWords.length - 1];
  const newLast = `${borrowed} ${last}`;

  // Only rebalance if the merged final line still fits.
  if (measure(newLast) > maxWidth) return lines;

  const newPrev = prevWords.slice(0, -1).join(' ');
  const result = lines.slice(0, -2);
  result.push(newPrev, newLast);
  return result;
}

// Public: wrap a logical line and apply orphan rebalancing.
export function wrapLine(text: string, maxWidth: number, measure: Measurer): string[] {
  const wrapped = greedyWrap(text, maxWidth, measure);
  return rebalanceOrphan(wrapped, maxWidth, measure);
}

// Public: wrap a prose paragraph (same algorithm; kept as a distinct name so
// intent is clear at call sites).
export function wrapParagraph(text: string, maxWidth: number, measure: Measurer): string[] {
  return wrapLine(text, maxWidth, measure);
}

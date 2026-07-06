// A5 page geometry (in points, 1pt = 1/72 inch) and typographic constants
// for the poem-book PDF generator. All downstream math depends on these.

export const PAGE = {
  // A5 in points (jsPDF "a5" = [419.53, 595.28])
  width: 419.53,
  height: 595.28,
} as const;

export const MARGIN = {
  top: 64,
  bottom: 64,
  left: 54,
  right: 54,
} as const;

// The usable text box inside the margins.
export const CONTENT = {
  x: MARGIN.left,
  y: MARGIN.top,
  width: PAGE.width - MARGIN.left - MARGIN.right,
  height: PAGE.height - MARGIN.top - MARGIN.bottom,
} as const;

// Font sizes (pt)
export const FONT = {
  coverTitle: 30,
  coverSubtitle: 12,
  coverMeta: 10,
  copyrightHeading: 13,
  copyrightBody: 10,
  bioHeading: 20,
  bioBody: 11,
  tocHeading: 20,
  tocEntry: 11,
  poemTitlePage: 24,
  poemNumber: 11,
  verse: 11.5,
  stanzaGap: 11.5, // height of a blank line between stanzas
  footer: 8,
  qrCaption: 10,
} as const;

// Line-height multipliers relative to font size.
export const LEADING = {
  verse: 1.55,
  prose: 1.5,
  toc: 1.7,
} as const;

// The minimum number of lines that may be left alone at a page break when a
// stanza has to be split across pages (widow/orphan protection).
export const MIN_LINES_AT_BREAK = 2;

export const COLORS = {
  ink: '#111111',
  soft: '#555555',
  faint: '#888888',
  rule: '#cccccc',
} as const;

// Font family used throughout — jsPDF standard "times" supports Latin accents.
export const FONT_FAMILY = 'times';

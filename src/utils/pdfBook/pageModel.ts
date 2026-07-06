// A backend-agnostic description of a laid-out page. Both the PDF writer
// (drawToPdf) and the on-screen preview render from these descriptors, so the
// preview is guaranteed to match the downloaded file exactly.
//
// All coordinates are in PDF points (1pt = 1/72"), measured from the page's
// top-left corner. For text elements, `y` is the baseline (same convention as
// jsPDF's text()).

export type TextAlign = 'left' | 'center' | 'right';
export type FontStyle = 'normal' | 'bold' | 'italic';

export interface TextElement {
  kind: 'text';
  text: string;
  x: number;
  y: number; // baseline
  size: number;
  style: FontStyle;
  color: string;
  align: TextAlign;
}

export interface ImageElement {
  kind: 'image';
  dataUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RuleElement {
  kind: 'rule';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
  dashed?: boolean;
}

// A clickable hotspot: internal (pageNumber) or external (url).
export interface LinkElement {
  kind: 'link';
  x: number;
  y: number;
  w: number;
  h: number;
  pageNumber?: number;
  url?: string;
}

export type PageElement = TextElement | ImageElement | RuleElement | LinkElement;

export interface PageDescriptor {
  elements: PageElement[];
}

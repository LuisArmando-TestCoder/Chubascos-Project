// Deprecated: rendering now goes through composeBook.ts (page descriptors) and
// drawToPdf.ts (descriptors → jsPDF). Kept as a re-export for compatibility.
export { drawPagesToPdf } from './drawToPdf';
export { composeBookPages } from './composeBook';

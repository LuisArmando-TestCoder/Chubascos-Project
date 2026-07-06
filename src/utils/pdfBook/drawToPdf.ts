// Draws an array of PageDescriptors onto a jsPDF document. Pure output stage:
// no measurement or layout happens here, so it exactly reproduces whatever the
// preview shows.

import type { jsPDF } from 'jspdf';
import type { PageDescriptor } from './pageModel';
import { FONT_FAMILY } from './geometry';

export function drawPagesToPdf(doc: jsPDF, pages: PageDescriptor[]) {
  pages.forEach((page, index) => {
    if (index > 0) doc.addPage('a5', 'portrait');

    for (const el of page.elements) {
      switch (el.kind) {
        case 'text':
          doc.setFont(FONT_FAMILY, el.style);
          doc.setFontSize(el.size);
          doc.setTextColor(el.color);
          doc.text(el.text, el.x, el.y, { align: el.align });
          break;
        case 'image':
          doc.addImage(el.dataUrl, 'PNG', el.x, el.y, el.w, el.h);
          break;
        case 'rule':
          doc.setDrawColor(el.color);
          doc.setLineWidth(el.width);
          if (el.dashed) doc.setLineDashPattern([0.5, 2], 0);
          doc.line(el.x1, el.y1, el.x2, el.y2);
          if (el.dashed) doc.setLineDashPattern([], 0);
          break;
        case 'link':
          doc.link(el.x, el.y, el.w, el.h, el.pageNumber ? { pageNumber: el.pageNumber } : { url: el.url });
          break;
      }
    }
  });
}

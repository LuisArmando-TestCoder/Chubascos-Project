import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Synchronous version — marked supports sync parsing without async extensions
export function sanitizeMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(html);
}

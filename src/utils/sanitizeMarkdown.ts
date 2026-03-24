import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export async function sanitizeMarkdown(markdown: string): Promise<string> {
  const html = await marked.parse(markdown);
  return DOMPurify.sanitize(html);
}

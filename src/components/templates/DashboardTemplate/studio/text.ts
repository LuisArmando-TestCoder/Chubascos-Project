// Pure derivations used by the studio panels (unit-tested).

export type Visibility = 'public' | 'quiet' | 'hidden';

/** The two stored flags, read as one choice a poet understands. */
export function visibilityOf(post?: { isVisible?: boolean; isIndexed?: boolean } | null): Visibility {
  if (!post) return 'public';
  if (post.isVisible === false) return 'hidden';
  return post.isIndexed === false ? 'quiet' : 'public';
}

export function flagsFor(v: Visibility): { isVisible: boolean; isIndexed: boolean } {
  if (v === 'hidden') return { isVisible: false, isIndexed: false };
  return { isVisible: true, isIndexed: v === 'public' };
}

export interface PoemStats {
  verses: number;
  stanzas: number;
  words: number;
  readingLabel: string;
}

export function poemStats(text: string): PoemStats {
  const normalized = text.replace(/\r\n/g, '\n');
  const verses = normalized.split('\n').filter((l) => l.trim()).length;
  const stanzas = normalized.split(/\n\s*\n/).filter((b) => b.trim()).length;
  const words = normalized.split(/\s+/).filter(Boolean).length;
  // Verse is read slowly: ~130 words a minute.
  const seconds = Math.round((words / 130) * 60);
  const readingLabel = words === 0 ? '—' : seconds < 60 ? `${Math.max(seconds, 5)} s` : `${Math.round(seconds / 60)} min`;
  return { verses, stanzas, words, readingLabel };
}

/** "instagram.com/x" → "https://instagram.com/x"; leaves real schemes alone. */
export function normalizeLink(raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return `tel:${v.replace(/[^\d+]/g, '')}`;
  return `https://${v.replace(/^\/+/, '')}`;
}

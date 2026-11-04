import type { Metadata } from 'next';
import { BuscarContent } from './BuscarContent';
import { getTagCloud, searchByTag, searchPoems } from '@/actions/data';
import type { TabType } from './components/BuscarTabs';
import type { Tag } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Buscar',
  description: 'Busca dentro de los poemas, y por etiquetas entre poetas, libros y eventos de Chubascos.',
};

interface Props {
  searchParams: Promise<{ tag?: string; type?: string; q?: string }>;
}

const TABS: TabType[] = ['posts', 'events', 'books', 'users'];

/** A random rain to start, weighted towards tags that hold more work. */
function pickStartingTag(tags: Tag[]): string {
  if (tags.length === 0) return '';
  const weights = tags.map((t) => Math.sqrt((t.usedByPosts || 0) + (t.usedByEvents || 0) + (t.usedByBooks || 0)) || 0.1);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  return tags[weights.findIndex((w) => (r -= w) <= 0)]?.id || tags[0].id;
}

/**
 * Rendered on the server with results already in place: no spinner, no
 * client waterfall. The client takes over for every later interaction.
 */
export default async function BuscarPage({ searchParams }: Props) {
  const { tag, type, q } = await searchParams;
  const query = (q || '').slice(0, 80);
  const initialType: TabType = TABS.includes(type as TabType) ? (type as TabType) : 'posts';

  const tags = await getTagCloud();
  const initialTag = tag || (query ? '' : pickStartingTag(tags));

  const [tagResult, poemResult] = await Promise.all([
    initialTag ? searchByTag(initialTag) : Promise.resolve(null),
    query.length >= 2 ? searchPoems(query) : Promise.resolve(null),
  ]);

  return (
    <BuscarContent
      tags={tags}
      initialTag={initialTag}
      initialType={initialType}
      initialQuery={query}
      initialTagResult={tagResult}
      initialPoemResult={poemResult}
    />
  );
}

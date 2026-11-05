import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, getShader, getTagsByIds, getPreviousPost, getNextPost, getUserEvents } from '@/actions/data';
import { publicName } from '@/lib/handles';
import { findOwner, loadOwner } from '../../owner';
import { PostDetailTemplate } from '@/components/templates/PostDetailTemplate/PostDetailTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';

interface Props {
  params: Promise<{ userId: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId: segment, slug } = await params;
  const user = await findOwner(segment);
  if (!user) return { title: 'No encontrado' };

  const post = await getPost(user.id, slug);
  
  if (!post) return { title: 'Poema no encontrado' };
  const authorName = publicName(user);
  return {
    title: `${post.title} — ${authorName}`,
    description: post.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { userId: segment, slug } = await params;
  // Old links with an email land here too, then move to /u/<handle>/p/<slug>.
  const user = await loadOwner(segment, `/p/${encodeURIComponent(slug)}`);
  const post = await getPost(user.id, slug);
  if (!post) notFound();

  const [shader, tags, prevPost, nextPost, authorEvents] = await Promise.all([
    post.shaderId ? getShader(post.shaderId) : Promise.resolve(null),
    getTagsByIds(post.tagIds || []),
    getPreviousPost(post.userId, post.updatedAt),
    getNextPost(post.userId, post.updatedAt),
    getUserEvents(post.userId).catch(() => []),
  ]);

  return (
    <>
      <PostDetailTemplate post={post} author={user} shader={shader} tags={tags} prevPost={prevPost} nextPost={nextPost} authorEvents={authorEvents} />
      <Footer />
    </>
  );
}

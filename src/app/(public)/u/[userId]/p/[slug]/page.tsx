import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, getUserProfile, getUserProfileByEmail, getShader, getTagsByIds, getPreviousPost, getNextPost } from '@/actions/data';
import { PostDetailTemplate } from '@/components/templates/PostDetailTemplate/PostDetailTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';

interface Props {
  params: Promise<{ userId: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId: rawId, slug } = await params;
  const userId = decodeURIComponent(rawId);
  
  // Try to resolve user by ID or email
  let user = await getUserProfile(userId);
  if (!user) user = await getUserProfileByEmail(userId);

  const post = await getPost(user?.id || userId, slug);
  
  if (!post) return { title: 'Poema no encontrado | Chubascos' };
  const authorName = user?.username || user?.email.split('@')[0] || userId;
  return {
    title: `${post.title} — ${authorName} | Chubascos`,
    description: post.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { userId: rawId, slug } = await params;
  const userId = decodeURIComponent(rawId);
  console.log(`[PostDetailPage] Requested: userId=${userId}, slug=${slug}`);

  // Try to resolve user by ID or email
  let user = await getUserProfile(userId);
  if (!user) user = await getUserProfileByEmail(userId);

  const post = await getPost(user?.id || userId, slug);
  
  if (!post) {
    console.error(`[PostDetailPage] Post not found for: userId=${userId}, slug=${slug}`);
    notFound();
  }
  
  if (!user) {
    console.error(`[PostDetailPage] User profile not found for: userId=${userId}`);
    // If the user doesn't exist, we can't render the author block.
    // For now, let it pass or create a dummy user, but let's log it.
  }
  
  const [shader, tags, prevPost, nextPost] = await Promise.all([
    post.shaderId ? getShader(post.shaderId) : Promise.resolve(null),
    getTagsByIds(post.tagIds || []),
    getPreviousPost(post.userId, post.updatedAt),
    getNextPost(post.userId, post.updatedAt),
  ]);

  return (
    <>
      <PostDetailTemplate post={post} author={user!} shader={shader} tags={tags} prevPost={prevPost} nextPost={nextPost} />
      <Footer />
    </>
  );
}

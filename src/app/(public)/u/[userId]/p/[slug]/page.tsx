import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, getUserProfile, getShader, getTagsByIds } from '@/actions/data';
import { PostDetailTemplate } from '@/components/templates/PostDetailTemplate/PostDetailTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';

interface Props {
  params: Promise<{ userId: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId: rawId, slug } = await params;
  const userId = decodeURIComponent(rawId);
  const [post, user] = await Promise.all([getPost(userId, slug), getUserProfile(userId)]);
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
  const [post, user] = await Promise.all([getPost(userId, slug), getUserProfile(userId)]);
  
  if (!post) {
    console.error(`[PostDetailPage] Post not found for: userId=${userId}, slug=${slug}`);
    notFound();
  }
  
  if (!user) {
    console.error(`[PostDetailPage] User profile not found for: userId=${userId}`);
    // If the user doesn't exist, we can't render the author block.
    // For now, let it pass or create a dummy user, but let's log it.
  }
  
  const [shader, tags] = await Promise.all([
    post.shaderId ? getShader(post.shaderId) : Promise.resolve(null),
    getTagsByIds(post.tagIds || [])
  ]);

  return (
    <>
      <PostDetailTemplate post={post} author={user!} shader={shader} tags={tags} />
      <Footer />
    </>
  );
}

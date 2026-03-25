import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getUserProfile, getUserPosts } from '@/actions/data';
import { UserProfileTemplate } from '@/components/templates/UserProfileTemplate/UserProfileTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await getUserProfile(userId);
  if (!user) return { title: 'Usuario no encontrado | Chubascos' };
  const name = user.username || user.email.split('@')[0];
  return {
    title: `${name} | Chubascos`,
    description: user.bio || `Perfil de ${name} en Chubascos.`,
    openGraph: { title: name, description: user.bio || '' },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  const [user, postsResult] = await Promise.all([
    getUserProfile(userId),
    getUserPosts(userId, 10),
  ]);
  if (!user) notFound();
  return (
    <>
      <UserProfileTemplate user={user} initialPosts={postsResult.items} nextCursor={postsResult.nextCursor} />
      <Footer />
    </>
  );
}

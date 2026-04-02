import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBook, getUserProfile, getUserProfileByEmail } from '@/actions/data';
import { BookDetailTemplate } from '@/components/templates/BookDetailTemplate/BookDetailTemplate';
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

  const book = await getBook(user?.id || userId, slug);
  
  if (!book) return { title: 'Libro no encontrado | Chubascos' };
  
  const authorName = user?.username || user?.email.split('@')[0] || userId;
  return {
    title: `${book.title} — ${authorName} | Chubascos`,
    description: book.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    openGraph: {
      title: book.title,
      description: book.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    },
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { userId: rawId, slug } = await params;
  const userId = decodeURIComponent(rawId);
  
  // Try to resolve user by ID or email
  let user = await getUserProfile(userId);
  if (!user) user = await getUserProfileByEmail(userId);

  const book = await getBook(user?.id || userId, slug);
  
  if (!book) {
    notFound();
  }

  return (
    <>
      <BookDetailTemplate book={book} author={user!} />
      <Footer />
    </>
  );
}

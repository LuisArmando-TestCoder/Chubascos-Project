import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {getBook, getUserEvents } from '@/actions/data';
import { publicName } from '@/lib/handles';
import { findOwner, loadOwner } from '../../owner';
import { BookDetailTemplate } from '@/components/templates/BookDetailTemplate/BookDetailTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';

interface Props {
  params: Promise<{ userId: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId: segment, slug } = await params;
  const user = await findOwner(segment);
  if (!user) return { title: 'No encontrado' };

  const book = await getBook(user.id, slug);
  
  if (!book) return { title: 'Libro no encontrado' };
  
  const authorName = publicName(user);
  return {
    title: `${book.title} — ${authorName}`,
    description: book.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    openGraph: {
      title: book.title,
      description: book.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 160),
    },
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { userId: segment, slug } = await params;
  const user = await loadOwner(segment, `/b/${encodeURIComponent(slug)}`);
  const book = await getBook(user.id, slug);
  if (!book) notFound();

  const authorEvents = await getUserEvents(book.userId).catch(() => []);

  return (
    <>
      <BookDetailTemplate book={book} author={user} authorEvents={authorEvents} />
      <Footer />
    </>
  );
}

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/actions/auth';
import { getUserProfile } from '@/actions/data';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate/DashboardTemplate';

export const metadata: Metadata = {
  title: 'Panel | Chubascos',
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) redirect('/entrar');
  const user = await getUserProfile(session.userId);
  if (!user) redirect('/entrar');
  return <DashboardTemplate user={user} />;
}

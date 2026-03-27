import { Metadata } from 'next';
import EntrarTemplate from '@/components/templates/EntrarTemplate/EntrarTemplate';

export const metadata: Metadata = {
  title: 'Chubascos',
  description: 'Accede a tu archivo personal de charcos.',
};

export default function EntrarPage() {
  return <EntrarTemplate />;
}

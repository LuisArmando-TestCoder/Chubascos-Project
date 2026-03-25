import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BuscarContent } from './BuscarContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Buscar | Chubascos',
  description: 'Busca poemas, poetas y eventos en Chubascos por etiquetas.',
};

export default function BuscarPage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px 5vw', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>Cargando…</div>}>
      <BuscarContent />
    </Suspense>
  );
}

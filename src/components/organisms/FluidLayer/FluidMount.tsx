'use client';
import dynamic from 'next/dynamic';

// The water is decoration: never server-rendered, never blocking.
const FluidLayer = dynamic(() => import('./FluidLayer'), { ssr: false, loading: () => null });

export function FluidMount() {
  return <FluidLayer />;
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chubascos',
    short_name: 'Chubascos',
    description: 'Lluvias repentinas dejando charcos. Plataforma para poetas, artistas y alquimistas digitales.',
    lang: 'es',
    start_url: '/',
    display: 'standalone',
    background_color: '#06070a',
    theme_color: '#06070a',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { src: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
      { src: '/icons/icon-maskable-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
}

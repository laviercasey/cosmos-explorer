import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cosmos Explorer — Interactive 3D Solar System',
    short_name: 'Cosmos',
    description:
      'Real-time 3D simulation of the Solar System with 8 planets and an encyclopedia of 128 space missions.',
    start_url: '/?utm_source=pwa',
    display: 'standalone',
    background_color: '#00000a',
    theme_color: '#00000a',
    lang: 'en',
    scope: '/',
    dir: 'ltr',
    categories: ['education', 'science', 'entertainment'],
    orientation: 'any',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { getSiteUrl } from '@shared/seo';

const SITE = getSiteUrl();
const OG_IMAGE = `${SITE}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    template: '%s — Cosmos Explorer',
    default: 'Cosmos Explorer — Interactive 3D Solar System & Space Missions',
  },
  description:
    'Real-time 3D simulation of the Solar System with 8 planets and 128 space missions. Free, no install required.',
  applicationName: 'Cosmos Explorer',
  authors: [{ name: 'Cosmos Explorer' }],
  generator: 'Next.js',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon-180.png', sizes: '180x180' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
  },
  openGraph: {
    type: 'website',
    siteName: 'Cosmos Explorer',
    title: 'Cosmos Explorer — Interactive 3D Solar System & Space Missions',
    description:
      'Real-time 3D simulation of the Solar System with 8 planets and 128 space missions.',
    images: [{ url: OG_IMAGE, alt: 'Cosmos Explorer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cosmos Explorer — Interactive 3D Solar System & Space Missions',
    description:
      'Real-time 3D simulation of the Solar System with 8 planets and 128 space missions.',
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: '#00000a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}

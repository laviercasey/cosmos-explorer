import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@shared/seo';

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/*.json$', '/sw.js', '/workbox-*.js', '/registerSW.js'],
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: ['/api/', '/*.json$', '/sw.js', '/workbox-*.js', '/registerSW.js'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: '/api/',
      },
      { userAgent: 'AhrefsBot', disallow: '/' },
      { userAgent: 'SemrushBot', disallow: '/' },
      { userAgent: 'MJ12bot', disallow: '/' },
      { userAgent: 'DotBot', disallow: '/' },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'PerplexityBot', disallow: '/' },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}

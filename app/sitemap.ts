import type { MetadataRoute } from 'next';

import { fetchMissionsServer, fetchPlanetsServer } from '@shared/api/server';
import { getSiteUrl } from '@shared/seo';

import { routing } from '@i18n/routing';

export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

function buildLanguagesMap(site: string, path: string): Record<string, string> {
  const langs: Record<string, string> = {};
  for (const locale of routing.locales) {
    langs[locale] = `${site}/${locale}${path}`;
  }
  langs['x-default'] = `${site}${path}`;
  return langs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const entries: SitemapEntry[] = [];

  entries.push({
    url: `${site}/`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1,
    alternates: { languages: buildLanguagesMap(site, '') },
  });
  for (const locale of routing.locales) {
    entries.push({
      url: `${site}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: { languages: buildLanguagesMap(site, '') },
    });
  }

  for (const locale of routing.locales) {
    entries.push({
      url: `${site}/${locale}/planets`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: { languages: buildLanguagesMap(site, '/planets') },
    });
    entries.push({
      url: `${site}/${locale}/missions`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: { languages: buildLanguagesMap(site, '/missions') },
    });
  }

  for (const locale of routing.locales) {
    try {
      const planets = await fetchPlanetsServer({ lang: locale });
      for (const p of planets) {
        entries.push({
          url: `${site}/${locale}/planets/${p.slug}`,
          lastModified: now,
          changeFrequency: 'monthly',
          priority: 0.8,
          alternates: { languages: buildLanguagesMap(site, `/planets/${p.slug}`) },
        });
      }
    } catch {
    }
  }

  for (const locale of routing.locales) {
    try {
      const missions = await fetchMissionsServer({ lang: locale });
      for (const m of missions) {
        entries.push({
          url: `${site}/${locale}/missions/${m.slug}`,
          lastModified: now,
          changeFrequency: 'monthly',
          priority: 0.6,
          alternates: { languages: buildLanguagesMap(site, `/missions/${m.slug}`) },
        });
      }
    } catch {
    }
  }

  return entries;
}

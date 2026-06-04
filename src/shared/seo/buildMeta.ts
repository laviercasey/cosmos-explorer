import type { Metadata } from 'next';

import type { Planet } from '@entities/planet/model/types';

import type { BuildSeoOptions } from './types';

const DEFAULT_OG = '/og-image.png';

interface RootCopy {
  readonly title: string;
  readonly description: string;
  readonly keywords: string;
}

const ROOT_COPY: Record<'en' | 'ru', RootCopy> = {
  en: {
    title: 'Cosmos Explorer — Interactive 3D Solar System & Space Missions',
    description:
      'Explore the Solar System in real-time 3D: 8 planets with atmospheres, rings and moons, plus 128 space missions from Sputnik to Artemis. Free, no install.',
    keywords:
      'solar system 3D, interactive solar system, planets simulator, space missions encyclopedia, WebGL, Three.js',
  },
  ru: {
    title: 'Cosmos Explorer — интерактивная 3D Солнечная система и космические миссии',
    description:
      'Солнечная система в реальном времени в 3D: 8 планет с атмосферами, кольцами и лунами, а также 128 космических миссий — от «Спутника-1» до Artemis. Бесплатно, без установки.',
    keywords:
      'солнечная система 3D, интерактивная солнечная система, планеты симулятор, космические миссии, WebGL, Three.js',
  },
};

function planetCopy(planet: Planet, lang: 'en' | 'ru'): RootCopy {
  const diameter = Math.round(planet.radiusKm * 2);
  const moons = planet.totalMoonCount;
  const tempAvg = Math.round(planet.tempAvgC);
  if (lang === 'ru') {
    return {
      title: `${planet.name} в 3D — Cosmos Explorer`,
      description: `${planet.name}: диаметр ${String(diameter)} км, ${String(moons)} спутников, средняя температура ${String(tempAvg)}°C. Интерактивная 3D-модель и факты о планете.`,
      keywords: `${planet.name} 3D, планета ${planet.name}, ${planet.name} факты, солнечная система`,
    };
  }
  return {
    title: `${planet.name} in 3D — Cosmos Explorer`,
    description: `${planet.name}: ${String(diameter)} km across, ${String(moons)} moons, average ${String(tempAvg)}°C. Interactive 3D model with atmosphere, orbit and mission data.`,
    keywords: `${planet.name} 3D, ${planet.name} planet, ${planet.name} facts, solar system`,
  };
}

export function planetJsonLd(
  planet: Planet,
  siteUrl: string,
  lang: 'en' | 'ru',
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    additionalType: 'https://schema.org/Thing',
    name: planet.name,
    alternateName: planet.slug,
    description: planet.description,
    inLanguage: lang,
    url: `${siteUrl}/${lang}/planets/${planet.slug}`,
    image: `${siteUrl}${DEFAULT_OG}`,
    subjectOf: {
      '@type': 'CreativeWork',
      name: `${planet.name} — interactive 3D model`,
      creator: { '@id': `${siteUrl}/#organization` },
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Radius',
        value: planet.radiusKm,
        unitCode: 'KMT',
      },
      {
        '@type': 'PropertyValue',
        name: 'Mass',
        value: planet.massKg,
        unitCode: 'KGM',
      },
      {
        '@type': 'PropertyValue',
        name: 'Mean surface temperature',
        value: planet.tempAvgC,
        unitCode: 'CEL',
      },
      {
        '@type': 'PropertyValue',
        name: 'Number of moons',
        value: planet.totalMoonCount,
      },
      {
        '@type': 'PropertyValue',
        name: 'Orbital period',
        value: planet.periodDays,
        unitCode: 'DAY',
      },
    ],
  };
}

export function buildSeoMeta({ lang, selectedPlanet, siteUrl }: BuildSeoOptions): Metadata {
  const root = ROOT_COPY[lang];
  const ogLocale = lang === 'ru' ? 'ru_RU' : 'en_US';
  const altLocale = lang === 'ru' ? 'en_US' : 'ru_RU';
  const ogImageUrl = `${siteUrl}${DEFAULT_OG}`;

  if (!selectedPlanet) {
    const canonical = `${siteUrl}/${lang}`;
    return {
      title: root.title,
      description: root.description,
      keywords: root.keywords,
      alternates: {
        canonical,
        languages: {
          en: `${siteUrl}/en`,
          ru: `${siteUrl}/ru`,
          'x-default': `${siteUrl}/`,
        },
      },
      openGraph: {
        type: 'website',
        url: canonical,
        title: root.title,
        description: root.description,
        siteName: 'Cosmos Explorer',
        locale: ogLocale,
        alternateLocale: altLocale,
        images: [{ url: ogImageUrl, alt: root.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: root.title,
        description: root.description,
        images: [ogImageUrl],
      },
    };
  }

  const p = planetCopy(selectedPlanet, lang);
  const slug = selectedPlanet.slug;
  const canonical = `${siteUrl}/${lang}/planets/${slug}`;
  return {
    title: { absolute: p.title },
    description: p.description,
    keywords: p.keywords,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/planets/${slug}`,
        ru: `${siteUrl}/ru/planets/${slug}`,
        'x-default': `${siteUrl}/planets/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title: p.title,
      description: p.description,
      siteName: 'Cosmos Explorer',
      locale: ogLocale,
      alternateLocale: altLocale,
      images: [{ url: ogImageUrl, alt: p.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: p.title,
      description: p.description,
      images: [ogImageUrl],
    },
  };
}

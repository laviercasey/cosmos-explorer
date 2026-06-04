import type { Metadata } from 'next';
import { describe, it, expect } from 'vitest';

import type { Planet } from '@entities/planet/model/types';

import { buildSeoMeta, planetJsonLd } from './buildMeta';

function titleAsString(title: Metadata['title']): string {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && 'absolute' in title && typeof title.absolute === 'string') {
    return title.absolute;
  }
  if (title && typeof title === 'object' && 'default' in title && typeof title.default === 'string') {
    return title.default;
  }
  return '';
}

function descriptionAsString(description: Metadata['description']): string {
  return typeof description === 'string' ? description : '';
}

const mercury: Planet = {
  name: 'Mercury',
  slug: 'mercury',
  index: 0,
  type: 'terrestrial',
  description: 'Smallest and innermost planet.',
  semiMajorAxisAU: 0.387,
  eccentricity: 0.2,
  inclinationDeg: 7,
  periodDays: 88,
  orbitalSpeedKmS: 47,
  radiusKm: 2439,
  massKg: 3.3e23,
  massEarths: 0.055,
  surfaceGravityMs2: 3.7,
  escapeVelocityKmS: 4.25,
  densityGCm3: 5.4,
  obliquityDeg: 0,
  rotationPeriodHours: 1407,
  flatteningFactor: 0,
  tempMinC: -180,
  tempMaxC: 430,
  tempAvgC: 167,
  albedo: 0.088,
  atmosphere: { composition: [], surfacePressureAtm: 0, hasGreenhouse: false, notes: '' },
  surfaceFeatures: [],
  facts: [],
  moons: [],
  totalMoonCount: 0,
  missions: [],
  colorHex: '#aaa',
  emissiveHex: '#000',
  roughness: 1,
  metalness: 0,
  hasAtmosphereGlow: false,
  atmosphereColorHex: null,
  atmosphereOpacity: 0,
  hasCloudLayer: false,
  cloudColorHex: null,
  hasRings: false,
  ringData: null,
  visualRadius: 0.38,
  orbitDistance: 9,
  canvasTexture: null,
};

const SITE = 'https://cosmos.example';

describe('buildSeoMeta (Next 15 Metadata shape)', () => {
  it('returns English root copy when nothing is selected', () => {
    const meta = buildSeoMeta({ lang: 'en', selectedPlanet: null, siteUrl: SITE });
    expect(typeof meta.title).toBe('string');
    expect(meta.title).toContain('Cosmos Explorer');
    expect(meta.title).toContain('3D');
    expect(meta.description).toBeDefined();
    expect((meta.description ?? '').length).toBeGreaterThan(100);
    expect(meta.alternates?.canonical).toBe(`${SITE}/en`);
    expect(meta.alternates?.languages).toMatchObject({
      en: `${SITE}/en`,
      ru: `${SITE}/ru`,
      'x-default': `${SITE}/`,
    });
    expect(meta.openGraph?.locale).toBe('en_US');
  });

  it('returns Russian root copy when lang is ru', () => {
    const meta = buildSeoMeta({ lang: 'ru', selectedPlanet: null, siteUrl: SITE });
    expect(typeof meta.title).toBe('string');
    expect(titleAsString(meta.title)).toMatch(/Солнечная система/i);
    expect(meta.alternates?.canonical).toBe(`${SITE}/ru`);
    expect(meta.openGraph?.locale).toBe('ru_RU');
    expect(meta.openGraph?.alternateLocale).toBe('en_US');
  });

  it('builds planet-specific meta with diameter and moon count in description', () => {
    const meta = buildSeoMeta({ lang: 'en', selectedPlanet: mercury, siteUrl: SITE });
    expect(titleAsString(meta.title)).toContain('Mercury');
    expect(descriptionAsString(meta.description)).toContain('4878 km');
    expect(descriptionAsString(meta.description)).toContain('0 moons');
    expect(meta.alternates?.canonical).toBe(`${SITE}/en/planets/mercury`);
    expect(meta.alternates?.languages).toMatchObject({
      en: `${SITE}/en/planets/mercury`,
      ru: `${SITE}/ru/planets/mercury`,
    });
    const og = meta.openGraph as { type?: string } | undefined;
    expect(og?.type).toBe('article');
  });

  it('emits absolute og:image URL', () => {
    const meta = buildSeoMeta({ lang: 'en', selectedPlanet: null, siteUrl: SITE });
    const og = meta.openGraph;
    expect(og).toBeDefined();
    const images = og?.images;
    const list = Array.isArray(images) ? images : images ? [images] : [];
    const first = list[0] as { url?: string } | string | undefined;
    const url = typeof first === 'string' ? first : (first?.url ?? '');
    expect(url).toBe(`${SITE}/og-image.png`);
  });
});

describe('planetJsonLd', () => {
  it('returns a Place JSON-LD with physical properties', () => {
    const block = planetJsonLd(mercury, SITE, 'en');
    expect(block['@type']).toBe('Place');
    expect(block.name).toBe('Mercury');
    expect(block.url).toBe(`${SITE}/en/planets/mercury`);
    const props = block.additionalProperty as readonly { name: string; value: number }[];
    const radius = props.find((p) => p.name === 'Radius');
    expect(radius?.value).toBe(2439);
  });
});

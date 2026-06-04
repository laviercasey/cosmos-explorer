import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Mission } from '@entities/mission/model/types';
import type { Planet } from '@entities/planet/model/types';

const fetchPlanetsServer = vi.fn();
const fetchMissionsServer = vi.fn();

vi.mock('@shared/api/server', () => ({
  fetchPlanetsServer: (opts: { lang: string }) => fetchPlanetsServer(opts),
  fetchMissionsServer: (opts: { lang: string }) => fetchMissionsServer(opts),
}));

vi.mock('@shared/seo', () => ({
  getSiteUrl: () => 'https://cosmos.example',
}));

import sitemap from './sitemap';

const minimalPlanet = (slug: string): Planet =>
  ({
    name: slug,
    slug,
    index: 0,
    type: 'terrestrial',
    description: '',
    semiMajorAxisAU: 1,
    eccentricity: 0,
    inclinationDeg: 0,
    periodDays: 0,
    orbitalSpeedKmS: 0,
    radiusKm: 0,
    massKg: 0,
    massEarths: 0,
    surfaceGravityMs2: 0,
    escapeVelocityKmS: 0,
    densityGCm3: 0,
    obliquityDeg: 0,
    rotationPeriodHours: 0,
    flatteningFactor: 0,
    tempMinC: 0,
    tempMaxC: 0,
    tempAvgC: 0,
    albedo: 0,
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
    visualRadius: 0,
    orbitDistance: 0,
    canvasTexture: null,
  }) satisfies Planet;

const minimalMission = (slug: string): Mission =>
  ({
    id: slug,
    slug,
    name: slug,
    agency: 'NASA',
    country: 'USA',
    year: 2000,
    endYear: null,
    destination: 'Moon',
    type: 'robotic',
    status: 'completed',
    description: '',
    keyFact: null,
    achievements: [],
    crew: null,
    planetSlugs: [],
  }) as Mission;

beforeEach(() => {
  fetchPlanetsServer.mockReset();
  fetchMissionsServer.mockReset();
});

async function callSitemap() {
  return sitemap();
}

describe('app/sitemap', () => {
  it('emits root + per-locale home URLs with hreflang alternates', async () => {
    fetchPlanetsServer.mockResolvedValue([]);
    fetchMissionsServer.mockResolvedValue([]);

    const out = await callSitemap();

    const urls = out.map((e) => e.url);
    expect(urls).toContain('https://cosmos.example/');
    expect(urls).toContain('https://cosmos.example/en');
    expect(urls).toContain('https://cosmos.example/ru');
    expect(urls).toContain('https://cosmos.example/en/planets');
    expect(urls).toContain('https://cosmos.example/ru/planets');
    expect(urls).toContain('https://cosmos.example/en/missions');
    expect(urls).toContain('https://cosmos.example/ru/missions');

    const home = out.find((e) => e.url === 'https://cosmos.example/');
    expect(home?.alternates?.languages).toMatchObject({
      en: 'https://cosmos.example/en',
      ru: 'https://cosmos.example/ru',
      'x-default': 'https://cosmos.example',
    });
    expect(home?.priority).toBe(1);
  });

  it('emits per-slug planet URLs for every locale', async () => {
    const earth = minimalPlanet('earth');
    const mars = minimalPlanet('mars');
    fetchPlanetsServer.mockResolvedValue([earth, mars]);
    fetchMissionsServer.mockResolvedValue([]);

    const out = await callSitemap();
    const urls = out.map((e) => e.url);

    expect(urls).toContain('https://cosmos.example/en/planets/earth');
    expect(urls).toContain('https://cosmos.example/ru/planets/earth');
    expect(urls).toContain('https://cosmos.example/en/planets/mars');
    expect(urls).toContain('https://cosmos.example/ru/planets/mars');

    const earthEn = out.find((e) => e.url === 'https://cosmos.example/en/planets/earth');
    expect(earthEn?.alternates?.languages).toMatchObject({
      en: 'https://cosmos.example/en/planets/earth',
      ru: 'https://cosmos.example/ru/planets/earth',
      'x-default': 'https://cosmos.example/planets/earth',
    });
    expect(earthEn?.priority).toBe(0.8);

    expect(fetchPlanetsServer).toHaveBeenCalledTimes(2);
    expect(fetchPlanetsServer).toHaveBeenCalledWith({ lang: 'en' });
    expect(fetchPlanetsServer).toHaveBeenCalledWith({ lang: 'ru' });
  });

  it('emits per-slug mission URLs for every locale', async () => {
    const apollo = minimalMission('apollo-11');
    fetchPlanetsServer.mockResolvedValue([]);
    fetchMissionsServer.mockResolvedValue([apollo]);

    const out = await callSitemap();
    const urls = out.map((e) => e.url);

    expect(urls).toContain('https://cosmos.example/en/missions/apollo-11');
    expect(urls).toContain('https://cosmos.example/ru/missions/apollo-11');

    const apolloRu = out.find((e) => e.url === 'https://cosmos.example/ru/missions/apollo-11');
    expect(apolloRu?.alternates?.languages).toMatchObject({
      en: 'https://cosmos.example/en/missions/apollo-11',
      ru: 'https://cosmos.example/ru/missions/apollo-11',
    });
    expect(apolloRu?.priority).toBe(0.6);
  });

  it('still produces a valid sitemap when the API throws (offline build)', async () => {
    fetchPlanetsServer.mockRejectedValue(new Error('ECONNREFUSED'));
    fetchMissionsServer.mockRejectedValue(new Error('ECONNREFUSED'));

    const out = await callSitemap();

    const urls = out.map((e) => e.url);
    expect(urls).toContain('https://cosmos.example/en/planets');
    expect(urls).toContain('https://cosmos.example/ru/missions');
    expect(urls.some((u) => u.includes('/planets/'))).toBe(false);
    expect(urls.some((u) => u.includes('/missions/apollo-11'))).toBe(false);
  });
});

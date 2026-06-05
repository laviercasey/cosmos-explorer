import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import type { Planet } from '@entities/planet/model/types';

const fetchPlanetServer = vi.fn();
const fetchPlanetsServer = vi.fn();

vi.mock('@shared/api/server', () => ({
  fetchPlanetServer: (opts: { slug: string; lang: string }) => fetchPlanetServer(opts),
  fetchPlanetsServer: (opts: { lang: string }) => fetchPlanetsServer(opts),
}));

vi.mock('@shared/seo', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@shared/seo');
  return {
    ...actual,
    getSiteUrl: () => 'https://cosmos.example',
  };
});

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

import * as pageModule from './page';

beforeEach(() => {
  fetchPlanetServer.mockReset();
  fetchPlanetsServer.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe('app/[locale]/planets/[slug] generateMetadata', () => {
  it('returns absolute title, canonical, and language alternates for en', async () => {
    fetchPlanetServer.mockResolvedValue(mercury);

    const meta = await pageModule.generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: 'mercury' }),
    });

    const title = meta.title;
    expect(title).toBeTruthy();
    if (title && typeof title === 'object' && 'absolute' in title) {
      expect(title.absolute).toContain('Mercury');
      expect(title.absolute).toContain('3D');
    } else {
      throw new Error(`expected title.absolute, got ${JSON.stringify(title)}`);
    }

    expect(meta.alternates?.canonical).toBe('https://cosmos.example/en/planets/mercury');

    expect(meta.alternates?.languages).toMatchObject({
      en: 'https://cosmos.example/en/planets/mercury',
      ru: 'https://cosmos.example/ru/planets/mercury',
      'x-default': 'https://cosmos.example/planets/mercury',
    });

    const og = meta.openGraph as { type?: string; url?: string } | undefined;
    expect(og?.type).toBe('article');
    expect(og?.url).toBe('https://cosmos.example/en/planets/mercury');

    expect(fetchPlanetServer).toHaveBeenCalledWith({ slug: 'mercury', lang: 'en' });
  });

  it('uses Russian copy when locale is ru', async () => {
    fetchPlanetServer.mockResolvedValue(mercury);

    const meta = await pageModule.generateMetadata({
      params: Promise.resolve({ locale: 'ru', slug: 'mercury' }),
    });

    const title = meta.title;
    if (title && typeof title === 'object' && 'absolute' in title) {
      expect(title.absolute).toMatch(/Mercury/);
      expect(title.absolute).toMatch(/3D/);
    } else {
      throw new Error(`expected title.absolute`);
    }
    expect(meta.alternates?.canonical).toBe('https://cosmos.example/ru/planets/mercury');
    const desc = typeof meta.description === 'string' ? meta.description : '';
    expect(desc).toMatch(/диаметр/);
  });

  it('returns a noindex fallback when the planet is not found', async () => {
    fetchPlanetServer.mockResolvedValue(null);

    const meta = await pageModule.generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: 'doesnotexist' }),
    });

    expect(meta.title).toBe('Planet not found');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe('app/[locale]/planets/[slug] generateStaticParams', () => {
  it('enumerates planet slugs across both locales', async () => {
    const mars = { ...mercury, slug: 'mars', name: 'Mars' };
    fetchPlanetsServer
      .mockResolvedValueOnce([mercury, mars])
      .mockResolvedValueOnce([mercury, mars]);

    const out = await pageModule.generateStaticParams();

    expect(out).toHaveLength(4);
    expect(out).toContainEqual({ locale: 'en', slug: 'mercury' });
    expect(out).toContainEqual({ locale: 'en', slug: 'mars' });
    expect(out).toContainEqual({ locale: 'ru', slug: 'mercury' });
    expect(out).toContainEqual({ locale: 'ru', slug: 'mars' });
  });

  it('fails the build when the API is offline', async () => {
    fetchPlanetsServer.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(pageModule.generateStaticParams()).rejects.toThrow('ECONNREFUSED');
  });
});

describe('app/[locale]/planets/[slug] page render', () => {
  it('renders the planet name, breadcrumb, and a JSON-LD script in en', async () => {
    fetchPlanetServer.mockResolvedValue(mercury);

    const PlanetDetail = pageModule.default;
    const jsx = await PlanetDetail({
      params: Promise.resolve({ locale: 'en', slug: 'mercury' }),
    });

    const { container } = render(jsx);

    expect(container.textContent).toContain('MERCURY');
    expect(container.textContent).toContain('Smallest and innermost planet');
    const links = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('/en/planets');
    const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders Russian labels when locale is ru', async () => {
    const populated: Planet = {
      ...mercury,
      moons: [
        {
          name: 'Phobos',
          radiusKm: 11,
          distanceKm: 9377,
          periodDays: 0.32,
          discoveredBy: 'Hall',
          discoveredYear: 1877,
          description: '',
        },
      ],
      totalMoonCount: 1,
      missions: [
        {
          name: 'Mariner 10',
          agency: 'NASA',
          year: 1973,
          type: 'flyby',
          achievement: 'first Mercury flyby',
        },
      ],
    };
    fetchPlanetServer.mockResolvedValue(populated);

    const PlanetDetail = pageModule.default;
    const jsx = await PlanetDetail({
      params: Promise.resolve({ locale: 'ru', slug: 'mercury' }),
    });

    const { container } = render(jsx);
    expect(container.textContent).toMatch(/ПЛАНЕТЫ/);
    expect(container.textContent).toMatch(/СПУТНИКИ/);
    expect(container.textContent).toMatch(/Phobos/);
    expect(container.textContent).toMatch(/Mariner 10/);
  });

  it('calls notFound() when the API returns null', async () => {
    fetchPlanetServer.mockResolvedValue(null);

    const PlanetDetail = pageModule.default;
    await expect(
      PlanetDetail({
        params: Promise.resolve({ locale: 'en', slug: 'doesnotexist' }),
      }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
  });
});

import { ImageResponse } from 'next/og';

import { fetchPlanetServer } from '@shared/api/server';

export const alt = 'Cosmos Explorer planet card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function PlanetOgImage({ params }: OgProps) {
  const { locale, slug } = await params;
  const planet = await fetchPlanetServer({ slug, lang: locale });
  const isRu = locale === 'ru';
  const name = planet?.name ?? (isRu ? 'Планета' : 'Planet');
  const tagline = planet
    ? isRu
      ? `Радиус ${planet.radiusKm.toLocaleString()} км · ${String(planet.totalMoonCount)} спутников`
      : `Radius ${planet.radiusKm.toLocaleString()} km · ${String(planet.totalMoonCount)} moons`
    : 'Cosmos Explorer';
  const accent = planet?.colorHex ?? '#44aaff';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 96px',
          background:
            'radial-gradient(circle at 25% 30%, rgba(68,170,255,0.18) 0%, rgba(0,0,10,1) 65%)',
          color: '#aabbdd',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 8,
            color: '#44aaff',
            opacity: 0.85,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          ✦ COSMOS EXPLORER
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 80px ${accent}, 0 0 160px ${accent}`,
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: 6,
              display: 'flex',
            }}
          >
            {name.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#aabbdd',
            opacity: 0.9,
            letterSpacing: 2,
            display: 'flex',
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            marginTop: 'auto',
            fontSize: 22,
            color: '#334466',
            letterSpacing: 4,
            display: 'flex',
          }}
        >
          {isRu ? 'ИНТЕРАКТИВНАЯ 3D СОЛНЕЧНАЯ СИСТЕМА' : 'INTERACTIVE 3D SOLAR SYSTEM'}
        </div>
      </div>
    ),
    { ...size },
  );
}

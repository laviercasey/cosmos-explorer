import { ImageResponse } from 'next/og';

import { fetchMissionServer } from '@shared/api/server';

export const alt = 'Cosmos Explorer mission card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function MissionOgImage({ params }: OgProps) {
  const { locale, slug } = await params;
  const mission = await fetchMissionServer({ slug, lang: locale });
  const isRu = locale === 'ru';
  const name = mission?.name ?? (isRu ? 'Миссия' : 'Mission');
  const tagline = mission
    ? `${mission.agency} · ${String(mission.year)}${
        mission.destination ? ` · ${mission.destination}` : ''
      }`
    : 'Cosmos Explorer';

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
            'linear-gradient(135deg, rgba(0,0,10,1) 0%, rgba(8,16,40,1) 60%, rgba(20,8,40,1) 100%)',
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
          ◈ COSMOS · MISSION
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 3,
            marginBottom: 22,
            lineHeight: 1.05,
            display: 'flex',
            maxWidth: 1000,
          }}
        >
          {name.toUpperCase()}
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
          {isRu ? 'ЭНЦИКЛОПЕДИЯ КОСМИЧЕСКИХ МИССИЙ' : 'SPACE MISSIONS ENCYCLOPEDIA'}
        </div>
      </div>
    ),
    { ...size },
  );
}

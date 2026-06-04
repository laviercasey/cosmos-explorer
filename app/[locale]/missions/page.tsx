import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { fetchMissionsServer } from '@shared/api/server';
import { getSiteUrl } from '@shared/seo';

export const revalidate = 3600;

interface MissionsIndexProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const site = getSiteUrl();
  const isRu = locale === 'ru';
  const title = isRu
    ? 'Космические миссии — энциклопедия от Спутника до Artemis | Cosmos Explorer'
    : 'Space missions — encyclopedia from Sputnik to Artemis | Cosmos Explorer';
  const description = isRu
    ? '128 космических миссий: NASA, Роскосмос, ESA, JAXA, ISRO, SpaceX. Фильтры по агентству, направлению и десятилетию.'
    : '128 space missions: NASA, Roscosmos, ESA, JAXA, ISRO, SpaceX. Filter by agency, destination, and decade.';
  return {
    title,
    description,
    alternates: {
      canonical: `${site}/${locale}/missions`,
      languages: {
        en: `${site}/en/missions`,
        ru: `${site}/ru/missions`,
        'x-default': `${site}/missions`,
      },
    },
    openGraph: {
      type: 'website',
      url: `${site}/${locale}/missions`,
      title,
      description,
      siteName: 'Cosmos Explorer',
      locale: isRu ? 'ru_RU' : 'en_US',
      alternateLocale: isRu ? 'en_US' : 'ru_RU',
    },
  };
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export default async function MissionsIndex({ params, searchParams }: MissionsIndexProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const agency = firstParam(sp['agency']);
  const decade = firstParam(sp['decade']);
  const isRu = locale === 'ru';

  const missions = await fetchMissionsServer({ lang: locale });
  const filtered = missions
    .filter((m) => (agency ? m.agency === agency : true))
    .filter((m) => {
      if (!decade) return true;
      const dec = m.year ? `${String(Math.floor(m.year / 10) * 10)}s` : '';
      return dec === decade;
    })
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  const agencies = [...new Set(missions.map((m) => m.agency).filter(Boolean))].sort();
  const decades = [
    ...new Set(
      missions
        .map((m) => (m.year ? `${String(Math.floor(m.year / 10) * 10)}s` : null))
        .filter((d): d is string => d !== null),
    ),
  ].sort();

  const heading = isRu ? 'Космические миссии' : 'Space missions';
  const intro = isRu
    ? 'Краткая энциклопедия — ссылки ведут на полные карточки миссий.'
    : 'A concise encyclopedia — links lead to full mission pages.';

  return (
    <main
      style={{
        padding: '40px 24px 80px',
        maxWidth: 960,
        margin: '0 auto',
        fontFamily: "'Courier New', monospace",
        color: '#aabbdd',
        background: '#00000a',
        minHeight: '100vh',
      }}
    >
      <nav
        aria-label="Breadcrumb"
        style={{ fontSize: 12, color: '#334466', letterSpacing: '0.18em', marginBottom: 18 }}
      >
        <Link href={`/${locale}`} style={{ color: '#44aaff', textDecoration: 'none' }}>
          COSMOS
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>{isRu ? 'МИССИИ' : 'MISSIONS'}</span>
      </nav>

      <h1
        style={{
          color: '#44aaff',
          fontSize: 28,
          letterSpacing: '0.18em',
          marginTop: 0,
          marginBottom: 12,
        }}
      >
        {heading.toUpperCase()}
      </h1>
      <p style={{ color: '#aabbdd', opacity: 0.8, marginBottom: 24, lineHeight: 1.7 }}>{intro}</p>

      <form
        method="get"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#334466' }}>
            {isRu ? 'АГЕНТСТВО' : 'AGENCY'}
          </span>
          <select
            name="agency"
            defaultValue={agency ?? ''}
            style={{
              fontFamily: "'Courier New', monospace",
              padding: '6px 8px',
              background: '#00040f',
              color: '#aabbdd',
              border: '1px solid rgba(68,170,255,0.25)',
              borderRadius: 3,
              minWidth: 140,
            }}
          >
            <option value="">{isRu ? 'Все' : 'All'}</option>
            {agencies.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#334466' }}>
            {isRu ? 'ДЕСЯТИЛЕТИЕ' : 'DECADE'}
          </span>
          <select
            name="decade"
            defaultValue={decade ?? ''}
            style={{
              fontFamily: "'Courier New', monospace",
              padding: '6px 8px',
              background: '#00040f',
              color: '#aabbdd',
              border: '1px solid rgba(68,170,255,0.25)',
              borderRadius: 3,
              minWidth: 100,
            }}
          >
            <option value="">{isRu ? 'Все' : 'All'}</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 11,
            letterSpacing: '0.15em',
            color: '#44aaff',
            background: 'rgba(68,170,255,0.08)',
            border: '1px solid rgba(68,170,255,0.4)',
            borderRadius: 3,
            padding: '7px 14px',
            cursor: 'pointer',
            alignSelf: 'flex-end',
          }}
        >
          {isRu ? 'ПРИМЕНИТЬ' : 'APPLY'}
        </button>
      </form>

      <p style={{ color: '#334466', fontSize: 11, letterSpacing: '0.15em', marginBottom: 18 }}>
        {isRu ? 'НАЙДЕНО' : 'SHOWING'} {String(filtered.length)} / {String(missions.length)}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 14 }}>
        {filtered.map((m) => (
          <li
            key={m.slug ?? m.id}
            style={{
              border: '1px solid rgba(68,170,255,0.18)',
              borderRadius: 6,
              padding: '14px 18px',
              background: 'rgba(68,170,255,0.04)',
            }}
          >
            <Link
              href={`/${locale}/missions/${m.slug ?? m.id}`}
              style={{
                color: '#44aaff',
                fontSize: 17,
                letterSpacing: '0.1em',
                textDecoration: 'none',
              }}
            >
              {m.name}
            </Link>
            <div
              style={{
                fontSize: 11,
                color: '#334466',
                letterSpacing: '0.12em',
                marginTop: 4,
              }}
            >
              {m.agency} · {m.year}
              {m.endYear && m.endYear !== m.year ? `–${String(m.endYear)}` : ''}
              {m.destination ? ` · ${m.destination}` : ''}
            </div>
            {m.description && (
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#aabbdd',
                  opacity: 0.8,
                }}
              >
                {m.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

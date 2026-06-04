import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { fetchPlanetsServer } from '@shared/api/server';
import { getSiteUrl } from '@shared/seo';

export const revalidate = 3600;

interface PlanetsIndexProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PlanetsIndexProps): Promise<Metadata> {
  const { locale } = await params;
  const site = getSiteUrl();
  const isRu = locale === 'ru';
  const title = isRu
    ? 'Планеты Солнечной системы — 3D обзор и факты | Cosmos Explorer'
    : 'Planets of the Solar System — 3D overview and facts | Cosmos Explorer';
  const description = isRu
    ? 'Все восемь планет Солнечной системы: интерактивные 3D-модели, атмосферы, спутники и ключевые миссии.'
    : 'All eight planets of the Solar System: interactive 3D models, atmospheres, moons and key missions.';

  return {
    title,
    description,
    alternates: {
      canonical: `${site}/${locale}/planets`,
      languages: {
        en: `${site}/en/planets`,
        ru: `${site}/ru/planets`,
        'x-default': `${site}/planets`,
      },
    },
    openGraph: {
      type: 'website',
      url: `${site}/${locale}/planets`,
      title,
      description,
      siteName: 'Cosmos Explorer',
      locale: isRu ? 'ru_RU' : 'en_US',
      alternateLocale: isRu ? 'en_US' : 'ru_RU',
    },
  };
}

export default async function PlanetsIndex({ params }: PlanetsIndexProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Common' });
  const planets = await fetchPlanetsServer({ lang: locale });
  const heading = locale === 'ru' ? 'Планеты Солнечной системы' : 'Planets of the Solar System';
  const intro =
    locale === 'ru'
      ? 'Восемь планет, которые мы зовём домом — каждой посвящена интерактивная страница.'
      : 'Eight planets we call home — each has its own interactive page.';

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
          {t('appTitle')}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>{locale === 'ru' ? 'Планеты' : 'Planets'}</span>
      </nav>

      <h1
        style={{
          color: '#44aaff',
          fontSize: 28,
          letterSpacing: '0.18em',
          marginTop: 0,
          marginBottom: 12,
          textShadow: '0 0 12px rgba(68,170,255,0.4)',
        }}
      >
        {heading.toUpperCase()}
      </h1>
      <p style={{ color: '#aabbdd', opacity: 0.8, marginBottom: 32, lineHeight: 1.7 }}>{intro}</p>

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 16 }}>
        {planets.map((p) => (
          <li
            key={p.slug}
            style={{
              border: '1px solid rgba(68,170,255,0.18)',
              borderRadius: 6,
              padding: '14px 18px',
              background: 'rgba(68,170,255,0.04)',
            }}
          >
            <Link
              href={`/${locale}/planets/${p.slug}`}
              style={{
                color: '#44aaff',
                fontSize: 18,
                letterSpacing: '0.12em',
                textDecoration: 'none',
              }}
            >
              {p.name.toUpperCase()}
            </Link>
            {p.description && (
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#aabbdd',
                  opacity: 0.8,
                }}
              >
                {p.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

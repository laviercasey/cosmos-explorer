import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchMissionServer, fetchMissionsServer } from '@shared/api/server';
import { getSiteUrl, safeJsonLd } from '@shared/seo';

import { routing } from '@i18n/routing';

export const revalidate = 86400;
export const dynamicParams = true;

interface MissionDetailProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    try {
      const missions = await fetchMissionsServer({ lang: locale });
      for (const m of missions) {
        const slug = m.slug ?? m.id;
        if (slug) out.push({ locale, slug });
      }
    } catch {
    }
  }
  return out;
}

export async function generateMetadata({ params }: MissionDetailProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const mission = await fetchMissionServer({ slug, lang: locale });
  if (!mission) {
    notFound();
  }
  const site = getSiteUrl();
  const isRu = locale === 'ru';
  const title = isRu
    ? `${mission.name} (${String(mission.year)}) — ${mission.agency} | Cosmos Explorer`
    : `${mission.name} (${String(mission.year)}) — ${mission.agency} | Cosmos Explorer`;
  const description = mission.description.length > 0
    ? mission.description.slice(0, 280)
    : isRu
      ? `Космическая миссия ${mission.name} от ${mission.agency}, ${String(mission.year)} год.`
      : `Space mission ${mission.name} by ${mission.agency} in ${String(mission.year)}.`;
  const canonical = `${site}/${locale}/missions/${slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        en: `${site}/en/missions/${slug}`,
        ru: `${site}/ru/missions/${slug}`,
        'x-default': `${site}/missions/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      siteName: 'Cosmos Explorer',
      locale: isRu ? 'ru_RU' : 'en_US',
      alternateLocale: isRu ? 'en_US' : 'ru_RU',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

interface JsonLdScriptProps {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

function JsonLdScript({ id, data }: JsonLdScriptProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

export default async function MissionDetail({ params }: MissionDetailProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const mission = await fetchMissionServer({ slug, lang: locale });
  if (!mission) {
    notFound();
  }

  const site = getSiteUrl();
  const isRu = locale === 'ru';
  const inLanguage = isRu ? 'ru-RU' : 'en-US';
  const url = `${site}/${locale}/missions/${slug}`;

  const creativeWorkJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: mission.name,
    alternateName: mission.slug ?? mission.id,
    description: mission.description || mission.name,
    inLanguage,
    url,
    dateCreated: mission.year ? String(mission.year) : undefined,
    datePublished: mission.year ? String(mission.year) : undefined,
    creator: {
      '@type': 'Organization',
      name: mission.agency,
    },
    about: mission.destination
      ? { '@type': 'Place', name: mission.destination }
      : undefined,
    keywords: [mission.agency, mission.destination, mission.type, mission.status]
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .join(', '),
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Cosmos Explorer', item: `${site}/${locale}` },
      {
        '@type': 'ListItem',
        position: 2,
        name: isRu ? 'Миссии' : 'Missions',
        item: `${site}/${locale}/missions`,
      },
      { '@type': 'ListItem', position: 3, name: mission.name, item: url },
    ],
  };

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
      <JsonLdScript id="ld-mission" data={creativeWorkJsonLd} />
      <JsonLdScript id="ld-breadcrumb-mission" data={breadcrumbsJsonLd} />

      <nav
        aria-label="Breadcrumb"
        style={{ fontSize: 12, color: '#334466', letterSpacing: '0.18em', marginBottom: 18 }}
      >
        <Link href={`/${locale}`} style={{ color: '#44aaff', textDecoration: 'none' }}>
          COSMOS
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <Link href={`/${locale}/missions`} style={{ color: '#44aaff', textDecoration: 'none' }}>
          {isRu ? 'МИССИИ' : 'MISSIONS'}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>{mission.name.toUpperCase()}</span>
      </nav>

      <h1
        style={{
          color: '#44aaff',
          fontSize: 30,
          letterSpacing: '0.18em',
          marginTop: 0,
          marginBottom: 8,
          textShadow: '0 0 14px rgba(68,170,255,0.4)',
        }}
      >
        {mission.name.toUpperCase()}
      </h1>
      <div
        style={{
          fontSize: 12,
          color: '#334466',
          letterSpacing: '0.15em',
          marginBottom: 24,
        }}
      >
        {mission.agency} · {mission.year}
        {mission.endYear && mission.endYear !== mission.year ? `–${String(mission.endYear)}` : ''}
        {mission.destination ? ` · ${mission.destination}` : ''}
        {mission.type ? ` · ${mission.type}` : ''}
      </div>

      {mission.description && (
        <p style={{ color: '#aabbdd', opacity: 0.85, marginBottom: 28, lineHeight: 1.75 }}>
          {mission.description}
        </p>
      )}

      {mission.keyFact && (
        <p style={{ color: '#ff8844', marginBottom: 22, opacity: 0.9 }}>★ {mission.keyFact}</p>
      )}

      {mission.achievements.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#44aaff', fontSize: 14, letterSpacing: '0.2em' }}>
            {(isRu ? 'ДОСТИЖЕНИЯ' : 'ACHIEVEMENTS')}
          </h2>
          <ul style={{ paddingLeft: 18, margin: 0, color: '#aabbdd', opacity: 0.85 }}>
            {mission.achievements.map((a) => (
              <li key={a} style={{ marginBottom: 6, lineHeight: 1.6 }}>
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      {mission.crew && mission.crew.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#44aaff', fontSize: 14, letterSpacing: '0.2em' }}>
            {isRu ? 'ЭКИПАЖ' : 'CREW'}
          </h2>
          <p style={{ color: '#aabbdd', opacity: 0.85 }}>{mission.crew.join(', ')}</p>
        </section>
      )}

      <p style={{ marginTop: 32 }}>
        <Link
          href={`/${locale}/missions`}
          style={{ color: '#44aaff', letterSpacing: '0.15em', textDecoration: 'none' }}
        >
          {isRu ? '← Все миссии' : '← All missions'}
        </Link>
      </p>
    </main>
  );
}

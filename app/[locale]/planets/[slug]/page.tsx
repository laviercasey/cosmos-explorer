import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchPlanetServer, fetchPlanetsServer } from '@shared/api/server';
import { buildSeoMeta, getSiteUrl, planetJsonLd, safeJsonLd } from '@shared/seo';

import { routing } from '@i18n/routing';

export const revalidate = 86400;
export const dynamicParams = true;

type Lang = 'en' | 'ru';

interface PlanetDetailProps {
  params: Promise<{ locale: string; slug: string }>;
}

function asLang(locale: string): Lang {
  return locale === 'ru' ? 'ru' : 'en';
}

export async function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const planets = await fetchPlanetsServer({ lang: locale });
    for (const p of planets) {
      out.push({ locale, slug: p.slug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: PlanetDetailProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = asLang(locale);
  const planet = await fetchPlanetServer({ slug, lang: locale });
  if (!planet) {
    return { title: 'Planet not found', robots: { index: false, follow: false } };
  }
  return buildSeoMeta({ lang, selectedPlanet: planet, siteUrl: getSiteUrl() });
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

export default async function PlanetDetail({ params }: PlanetDetailProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const planet = await fetchPlanetServer({ slug, lang: locale });
  if (!planet) {
    notFound();
  }

  const lang = asLang(locale);
  const site = getSiteUrl();
  const isRu = lang === 'ru';

  const placeJsonLd = planetJsonLd(planet, site, lang);
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Cosmos Explorer', item: `${site}/${locale}` },
      {
        '@type': 'ListItem',
        position: 2,
        name: isRu ? 'Планеты' : 'Planets',
        item: `${site}/${locale}/planets`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: planet.name,
        item: `${site}/${locale}/planets/${planet.slug}`,
      },
    ],
  };

  const labels = {
    overview: isRu ? 'Обзор' : 'Overview',
    radius: isRu ? 'Радиус' : 'Radius',
    mass: isRu ? 'Масса' : 'Mass',
    gravity: isRu ? 'Гравитация' : 'Gravity',
    day: isRu ? 'Сутки' : 'Day length',
    year: isRu ? 'Орбитальный период' : 'Orbital period',
    temp: isRu ? 'Средняя температура' : 'Mean surface temperature',
    atmosphere: isRu ? 'Атмосфера' : 'Atmosphere',
    composition: isRu ? 'Состав' : 'Composition',
    surfacePressure: isRu ? 'Давление на поверхности' : 'Surface pressure',
    moonsHeading: isRu ? 'Спутники' : 'Moons',
    missionsHeading: isRu ? 'Миссии' : 'Missions',
    earthMasses: isRu ? 'масс Земли' : 'Earth masses',
    earthDays: isRu ? 'земных дней' : 'Earth days',
    none: isRu ? 'Нет данных' : 'No data',
    backToPlanets: isRu ? '← Все планеты' : '← All planets',
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
      <JsonLdScript id="ld-place" data={placeJsonLd} />
      <JsonLdScript id="ld-breadcrumb-planet" data={breadcrumbsJsonLd} />

      <nav
        aria-label="Breadcrumb"
        style={{ fontSize: 12, color: '#334466', letterSpacing: '0.18em', marginBottom: 18 }}
      >
        <Link href={`/${locale}`} style={{ color: '#44aaff', textDecoration: 'none' }}>
          COSMOS
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <Link href={`/${locale}/planets`} style={{ color: '#44aaff', textDecoration: 'none' }}>
          {isRu ? 'ПЛАНЕТЫ' : 'PLANETS'}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>{planet.name.toUpperCase()}</span>
      </nav>

      <h1
        style={{
          color: '#44aaff',
          fontSize: 32,
          letterSpacing: '0.2em',
          marginTop: 0,
          marginBottom: 12,
          textShadow: '0 0 14px rgba(68,170,255,0.4)',
        }}
      >
        {planet.name.toUpperCase()}
      </h1>
      <p style={{ color: '#aabbdd', opacity: 0.85, marginBottom: 28, lineHeight: 1.75 }}>
        {planet.description}
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#44aaff', fontSize: 14, letterSpacing: '0.2em' }}>
          {labels.overview.toUpperCase()}
        </h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
            margin: 0,
            padding: 0,
          }}
        >
          <Stat label={labels.radius} value={`${planet.radiusKm.toLocaleString()} km`} />
          <Stat
            label={labels.mass}
            value={`${String(planet.massEarths)} ${labels.earthMasses}`}
          />
          <Stat label={labels.gravity} value={`${String(planet.surfaceGravityMs2)} m/s²`} />
          <Stat
            label={labels.day}
            value={`${Math.abs(planet.rotationPeriodHours).toFixed(1)} h`}
          />
          <Stat
            label={labels.year}
            value={`${planet.periodDays.toFixed(1)} ${labels.earthDays}`}
          />
          <Stat label={labels.temp} value={`${String(planet.tempAvgC)}°C`} />
        </dl>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#44aaff', fontSize: 14, letterSpacing: '0.2em' }}>
          {labels.atmosphere.toUpperCase()}
        </h2>
        <p style={{ color: '#aabbdd', opacity: 0.8, lineHeight: 1.7 }}>
          {labels.surfacePressure}:{' '}
          <strong style={{ color: '#44aaff' }}>
            {planet.atmosphere.surfacePressureAtm > 0
              ? `${planet.atmosphere.surfacePressureAtm.toFixed(2)} ATM`
              : labels.none}
          </strong>
        </p>
        {planet.atmosphere.composition.length > 0 && (
          <ul style={{ paddingLeft: 18, margin: '8px 0 0', color: '#aabbdd', opacity: 0.85 }}>
            {planet.atmosphere.composition.map((c) => (
              <li key={c.gas} style={{ marginBottom: 4 }}>
                {c.gas}: {c.percent}%
              </li>
            ))}
          </ul>
        )}
        {planet.atmosphere.notes && (
          <p style={{ color: '#aabbdd', opacity: 0.7, marginTop: 12, lineHeight: 1.7 }}>
            {planet.atmosphere.notes}
          </p>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#44aaff', fontSize: 14, letterSpacing: '0.2em' }}>
          {labels.moonsHeading.toUpperCase()} ({String(planet.totalMoonCount)})
        </h2>
        {planet.moons.length > 0 ? (
          <ul style={{ paddingLeft: 18, margin: 0, color: '#aabbdd', opacity: 0.85 }}>
            {planet.moons.map((m) => (
              <li key={m.name} style={{ marginBottom: 4 }}>
                <strong style={{ color: '#aabbdd' }}>{m.name}</strong>
                {m.discoveredYear ? ` — ${m.discoveredBy}, ${String(m.discoveredYear)}` : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#aabbdd', opacity: 0.7 }}>
            {isRu ? 'Естественных спутников не найдено.' : 'No known natural satellites.'}
          </p>
        )}
      </section>

      {planet.missions.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#44aaff', fontSize: 14, letterSpacing: '0.2em' }}>
            {labels.missionsHeading.toUpperCase()}
          </h2>
          <ul style={{ paddingLeft: 18, margin: 0, color: '#aabbdd', opacity: 0.85 }}>
            {planet.missions.slice(0, 12).map((m) => (
              <li key={`${m.name}-${String(m.year)}`} style={{ marginBottom: 4 }}>
                <strong>{m.name}</strong> — {m.agency}, {m.year}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: 32 }}>
        <Link
          href={`/${locale}/planets`}
          style={{ color: '#44aaff', letterSpacing: '0.15em', textDecoration: 'none' }}
        >
          {labels.backToPlanets}
        </Link>
      </p>
    </main>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div
      style={{
        background: 'rgba(68,170,255,0.05)',
        border: '1px solid rgba(68,170,255,0.15)',
        borderRadius: 4,
        padding: '8px 12px',
      }}
    >
      <dt style={{ color: '#334466', fontSize: 10, letterSpacing: '0.18em', marginBottom: 2 }}>
        {label.toUpperCase()}
      </dt>
      <dd style={{ margin: 0, color: '#aabbdd', fontSize: 14 }}>{value}</dd>
    </div>
  );
}

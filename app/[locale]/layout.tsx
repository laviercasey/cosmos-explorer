import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { ReactNode } from 'react';

import Umami from '@app/providers/Umami';
import { getSiteUrl, safeJsonLd } from '@shared/seo';

import { routing } from '@i18n/routing';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const site = getSiteUrl();
  const ogLocale = locale === 'ru' ? 'ru_RU' : 'en_US';
  const altLocale = locale === 'ru' ? 'en_US' : 'ru_RU';

  return {
    alternates: {
      canonical: `${site}/${locale}`,
      languages: {
        en: `${site}/en`,
        ru: `${site}/ru`,
        'x-default': `${site}/`,
      },
    },
    openGraph: {
      locale: ogLocale,
      alternateLocale: altLocale,
      url: `${site}/${locale}`,
    },
  };
}

interface JsonLdBlock {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

function buildJsonLdBlocks(locale: string, site: string): readonly JsonLdBlock[] {
  const inLanguage = locale === 'ru' ? 'ru-RU' : 'en-US';
  const orgId = `${site}/#organization`;
  const websiteId = `${site}/#website`;
  const webAppId = `${site}/#webapp`;

  const website: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${site}/${locale}`,
    name: 'Cosmos Explorer',
    inLanguage,
    description:
      locale === 'ru'
        ? 'Интерактивная 3D Солнечная система и энциклопедия космических миссий.'
        : 'Interactive 3D Solar System and space-missions encyclopedia.',
    publisher: { '@id': orgId },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site}/${locale}/missions?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId,
    name: 'Cosmos Explorer',
    url: site,
    logo: `${site}/icon.svg`,
  };

  const webApplication: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': webAppId,
    name: 'Cosmos Explorer',
    url: `${site}/${locale}`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and WebGL',
    inLanguage,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': orgId },
  };

  const breadcrumbs: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Cosmos Explorer',
        item: `${site}/${locale}`,
      },
    ],
  };

  return [
    { id: 'ld-website', data: website },
    { id: 'ld-organization', data: organization },
    { id: 'ld-webapplication', data: webApplication },
    { id: 'ld-breadcrumb', data: breadcrumbs },
  ];
}

function readEnv(name: string): string | null {
  const v = process.env[name];
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

interface AnalyticsScriptsProps {
  readonly ga4Id: string | null;
  readonly yandexId: string | null;
}

function AnalyticsScripts({ ga4Id, yandexId }: AnalyticsScriptsProps) {
  return (
    <>
      {ga4Id && (
        <>
          <Script
            id="ga4-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(ga4Id)}, { anonymize_ip: true });`}
          </Script>
        </>
      )}
      {yandexId && (
        <Script id="yandex-metrika" strategy="lazyOnload">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

ym(${JSON.stringify(yandexId)}, "init", {
  clickmap:true,
  trackLinks:true,
  accurateTrackBounce:true,
  webvisor:true
});`}
        </Script>
      )}
    </>
  );
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const site = getSiteUrl();
  const jsonLdBlocks = buildJsonLdBlocks(locale, site);
  const ga4Id = readEnv('NEXT_PUBLIC_GA4_ID');
  const yandexId = readEnv('NEXT_PUBLIC_YANDEX_METRIKA_ID');

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Courier New', monospace",
          color: '#aabbdd',
          background: '#00000a',
          minHeight: '100vh',
        }}
      >
        {jsonLdBlocks.map((block) => (
          <script
            key={block.id}
            id={block.id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(block.data) }}
          />
        ))}
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <AnalyticsScripts ga4Id={ga4Id} yandexId={yandexId} />
        <Umami />
        {yandexId && (
          <noscript>
            <div>
              <img
                src={`https://mc.yandex.ru/watch/${encodeURIComponent(yandexId)}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        )}
      </body>
    </html>
  );
}

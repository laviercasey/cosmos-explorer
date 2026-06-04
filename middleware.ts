import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

function readOrigin(src: string | undefined): string {
  if (!src) return '';
  try {
    return new URL(src).origin;
  } catch {
    return '';
  }
}

function buildCsp(isDev: boolean): string {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? '';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const umamiOrigin = readOrigin(process.env.NEXT_PUBLIC_UMAMI_SRC);

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://www.googletagmanager.com',
    'https://mc.yandex.ru',
    umamiOrigin,
    isDev ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ');

  const wsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : '';

  const connectSrc = [
    "'self'",
    apiOrigin,
    apiBaseUrl,
    wsOrigin,
    'https://www.google-analytics.com',
    'https://mc.yandex.ru',
    umamiOrigin,
    isDev ? 'ws:' : '',
    isDev ? 'http://localhost:*' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const directives: readonly (string | false)[] = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://mc.yandex.ru`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    !isDev && 'upgrade-insecure-requests',
  ];

  return directives.filter(Boolean).join('; ');
}

const IS_DEV = process.env.NODE_ENV !== 'production';
const CSP = buildCsp(IS_DEV);

export default function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const legacyLang = url.searchParams.get('lang');
  if (legacyLang === 'en' || legacyLang === 'ru') {
    const next = url.clone();
    next.pathname = `/${legacyLang}${url.pathname === '/' ? '' : url.pathname}`;
    next.searchParams.delete('lang');
    return NextResponse.redirect(next, 308);
  }

  const response = intlMiddleware(request);

  response.headers.set('Content-Security-Policy', CSP);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|.*\\..*).*)'],
};

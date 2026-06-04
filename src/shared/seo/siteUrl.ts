const FALLBACK = 'https://cosmos.lavier.tech';

export function getSiteUrl(): string {
  const fromEnv: unknown = process.env.NEXT_PUBLIC_SITE_URL;
  const raw = typeof fromEnv === 'string' && fromEnv.trim() !== '' ? fromEnv : FALLBACK;
  return raw.replace(/\/+$/, '');
}

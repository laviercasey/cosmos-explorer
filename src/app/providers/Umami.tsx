'use client';

import Script from 'next/script';

function parseAllowedHosts(): Set<string> {
  const env = process.env.NEXT_PUBLIC_UMAMI_ALLOWED_HOSTS;
  const hosts = new Set<string>(['localhost']);
  if (!env) return hosts;
  for (const raw of env.split(',')) {
    const host = raw.trim().toLowerCase();
    if (host) hosts.add(host);
  }
  return hosts;
}

function isUmamiSrcAllowed(src: string, allowed: Set<string>): boolean {
  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' && host !== 'localhost') return false;
    return allowed.has(host);
  } catch {
    return false;
  }
}

export default function Umami() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  if (!src || !websiteId) return null;
  if (!isUmamiSrcAllowed(src, parseAllowedHosts())) return null;

  return (
    <Script
      id="umami-analytics"
      src={src}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}

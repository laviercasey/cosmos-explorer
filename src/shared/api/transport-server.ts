import 'server-only';

import { createConnectTransport } from '@connectrpc/connect-web';
import type { Transport } from '@connectrpc/connect';

interface NextFetchInit extends RequestInit {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

export interface ServerTransportCacheOptions {
  readonly revalidate: number;
  readonly tags: readonly string[];
}

function getInternalApiUrl(): string {
  const url = process.env.API_INTERNAL_URL;
  if (!url || url.trim() === '') {
    throw new Error('API_INTERNAL_URL is not set — required for Server Component fetches');
  }
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
}

export function createServerTransport(opts: ServerTransportCacheOptions): Transport {
  const tags = [...opts.tags];
  return createConnectTransport({
    baseUrl: getInternalApiUrl(),
    useBinaryFormat: false,
    fetch: ((input, init) => {
      const merged: NextFetchInit = {
        ...(init ?? {}),
        next: { revalidate: opts.revalidate, tags },
      };
      return fetch(input, merged);
    }) as typeof globalThis.fetch,
  });
}

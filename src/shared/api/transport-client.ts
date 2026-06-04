import { createConnectTransport } from '@connectrpc/connect-web';
import type { Transport } from '@connectrpc/connect';

const DEFAULT_BASE_URL = 'http://localhost:8080';

function getBrowserBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const raw = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
}

export const browserTransport: Transport = createConnectTransport({
  baseUrl: getBrowserBaseUrl(),
  useBinaryFormat: false,
});

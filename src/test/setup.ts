import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

if (typeof globalThis.AbortController === 'undefined') {
  globalThis.AbortController = class {
    signal = {
      aborted: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as AbortSignal;
    abort() {
      (this.signal as { aborted: boolean }).aborted = true;
    }
  } as unknown as typeof AbortController;
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}


vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers({ 'x-nonce': 'test-nonce' }))),
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }),
  ),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: unknown) => fn),
}));

vi.mock('next-intl/server', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('next-intl/server');
  return {
    ...actual,
    setRequestLocale: vi.fn(),
    getMessages: vi.fn(() => Promise.resolve({})),
    getTranslations: vi.fn(() => Promise.resolve((key: string) => key)),
  };
});

vi.mock('server-only', () => ({}));

vi.mock('next/link', async () => {
  const React = await import('react');
  interface LinkProps {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }
  function MockLink({ children, href, ...rest }: LinkProps) {
    return React.createElement('a', { href, ...rest }, children);
  }
  return { default: MockLink };
});

vi.mock('next/script', async () => {
  const React = await import('react');
  interface ScriptProps {
    children?: React.ReactNode;
    src?: string;
    id?: string;
    nonce?: string;
    strategy?: string;
    [key: string]: unknown;
  }
  function MockScript({ children, src, id, nonce, strategy: _strategy, ...rest }: ScriptProps) {
    if (typeof children === 'string') {
      return React.createElement('script', {
        id,
        nonce,
        ...rest,
        dangerouslySetInnerHTML: { __html: children },
      });
    }
    return React.createElement('script', { id, nonce, src, ...rest });
  }
  return { default: MockScript };
});

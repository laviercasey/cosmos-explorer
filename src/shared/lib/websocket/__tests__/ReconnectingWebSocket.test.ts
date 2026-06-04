import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReconnectingWebSocket from '../ReconnectingWebSocket';
import type { WsStatus } from '../types';

interface MockSocket {
  readyState: number;
  url: string;
  onopen: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  close: (code?: number, reason?: string) => void;
  send: (data: string) => void;
  fireOpen: () => void;
  fireClose: () => void;
  fireMessage: (data: string) => void;
}

let sockets: MockSocket[] = [];

function makeMockWebSocket() {
  return class MockWebSocketImpl {
    readyState = 0;
    url: string;
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      const self = this as unknown as MockSocket;
      self.fireOpen = () => {
        this.readyState = 1;
        this.onopen?.(new Event('open'));
      };
      self.fireClose = () => {
        this.readyState = 3;
        this.onclose?.(new Event('close') as CloseEvent);
      };
      self.fireMessage = (data: string) => {
        this.onmessage?.({ data } as MessageEvent);
      };
      sockets.push(self);
    }

    close(): void {
      this.readyState = 3;
    }

    send(): void {}
  } as unknown as typeof WebSocket;
}

describe('ReconnectingWebSocket', () => {
  beforeEach(() => {
    sockets = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits status idle → connecting → open on success', () => {
    const Mock = makeMockWebSocket();
    const statuses: WsStatus[] = [];
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.onStatusChange((s) => statuses.push(s));
    rws.connect();
    expect(sockets).toHaveLength(1);
    sockets[0]!.fireOpen();

    expect(statuses).toEqual(['idle', 'connecting', 'open']);
    rws.close();
  });

  it('delivers a parsed catalog frame to onFrame', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    const frames: unknown[] = [];
    rws.onFrame((f) => frames.push(f));
    rws.connect();
    sockets[0]!.fireOpen();
    sockets[0]!.fireMessage(
      JSON.stringify({
        v: 1,
        type: 'catalog',
        satellites: [{ id: 1, name: 'a' }],
      }),
    );
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ type: 'catalog' });
    rws.close();
  });

  it('ignores malformed frames', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    const frames: unknown[] = [];
    rws.onFrame((f) => frames.push(f));
    rws.connect();
    sockets[0]!.fireOpen();
    sockets[0]!.fireMessage('not json');
    sockets[0]!.fireMessage(JSON.stringify({ v: 1, type: 'bogus' }));
    expect(frames).toHaveLength(0);
    rws.close();
  });

  it('schedules exponential reconnect with bounded jitter', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();
    expect(sockets).toHaveLength(1);
    sockets[0]!.fireClose();
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    sockets[1]!.fireClose();
    vi.advanceTimersByTime(1999);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(3);

    rws.close();
  });

  it('respects jitter bounds (1±25%)', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0 });
    rws.connect();
    sockets[0]!.fireClose();
    vi.advanceTimersByTime(749);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    rws.close();

    sockets = [];
    const rws2 = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.999 });
    rws2.connect();
    sockets[0]!.fireClose();
    vi.advanceTimersByTime(1249);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(sockets).toHaveLength(2);
    rws2.close();
  });

  it('caps reconnect delay at 60s after enough failures', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();

    const expected = [1000, 2000, 4000, 8000, 16_000, 32_000, 60_000, 60_000];
    for (let i = 0; i < expected.length; i += 1) {
      sockets[sockets.length - 1]!.fireClose();
      vi.advanceTimersByTime(expected[i]! - 1);
      expect(sockets).toHaveLength(i + 1);
      vi.advanceTimersByTime(1);
      expect(sockets).toHaveLength(i + 2);
    }
    rws.close();
  });

  it('close() is idempotent and prevents further reconnects', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();
    sockets[0]!.fireOpen();
    rws.close();
    rws.close(); 
    sockets[0]!.fireClose();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });

  it('connect() is idempotent while a socket is alive', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();
    rws.connect();
    rws.connect();
    expect(sockets).toHaveLength(1);
    rws.close();
  });

  it('reports current status via status()', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    expect(rws.status()).toBe('idle');
    rws.connect();
    expect(rws.status()).toBe('connecting');
    sockets[0]!.fireOpen();
    expect(rws.status()).toBe('open');
    sockets[0]!.fireClose();
    expect(rws.status()).toBe('reconnecting');
    rws.close();
    expect(rws.status()).toBe('closed');
  });

  it('handles WebSocket constructor throwing without crashing', () => {
    const Mock = (() => {
      throw new Error('CSP blocked');
    }) as unknown as typeof WebSocket;
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();
    expect(rws.status()).toBe('reconnecting');
    rws.close();
  });

  it('does not open immediately when document.hidden is true', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const Mock = makeMockWebSocket();
      const rws = new ReconnectingWebSocket('ws://x', {
        WebSocketCtor: Mock,
        random: () => 0.5,
      });
      rws.connect();
      expect(sockets).toHaveLength(0);
      expect(rws.status()).toBe('reconnecting');
      rws.close();
    } finally {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    }
  });

  it('reconnects immediately when visibilitychange fires while disconnected', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();
    expect(sockets).toHaveLength(1);
    sockets[0]!.fireClose();
    expect(sockets).toHaveLength(1);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sockets).toHaveLength(2);
    rws.close();
  });

  it('reconnects on pageshow.persisted (bf-cache restore)', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    rws.connect();
    sockets[0]!.fireClose();
    expect(sockets).toHaveLength(1);
    const evt = new Event('pageshow') as Event & { persisted: boolean };
    Object.defineProperty(evt, 'persisted', { value: true });
    window.dispatchEvent(evt);
    expect(sockets).toHaveLength(2);
    rws.close();
  });

  it('onStatusChange immediately fires the current status to the new subscriber', () => {
    const Mock = makeMockWebSocket();
    const rws = new ReconnectingWebSocket('ws://x', { WebSocketCtor: Mock, random: () => 0.5 });
    const calls: WsStatus[] = [];
    rws.onStatusChange((s) => calls.push(s));
    expect(calls).toEqual(['idle']);
    rws.close();
  });
});

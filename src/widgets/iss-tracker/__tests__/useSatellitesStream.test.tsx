import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useSatellitesStream from '../lib/useSatellitesStream';

interface MockSocket {
  url: string;
  onopen: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  close: () => void;
  send: () => void;
  fireOpen: () => void;
  fireMessage: (data: string) => void;
  fireClose: () => void;
}

let sockets: MockSocket[] = [];
let OriginalWebSocket: typeof WebSocket | undefined;

class MockWebSocket {
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  readyState = 0;

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
}

describe('useSatellitesStream', () => {
  beforeEach(() => {
    sockets = [];
    OriginalWebSocket = globalThis.WebSocket;
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    if (OriginalWebSocket) {
      (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = OriginalWebSocket;
    }
  });

  it('returns idle state for null url and never opens a socket', () => {
    const { result } = renderHook(() => useSatellitesStream(null));
    expect(result.current.status).toBe('idle');
    expect(sockets).toHaveLength(0);
  });

  it('opens a socket, transitions to open, and pushes a catalog frame into state', () => {
    const { result } = renderHook(() => useSatellitesStream('ws://test'));
    expect(sockets).toHaveLength(1);

    act(() => {
      sockets[0]!.fireOpen();
    });
    expect(result.current.status).toBe('open');

    act(() => {
      sockets[0]!.fireMessage(
        JSON.stringify({
          v: 1,
          type: 'catalog',
          satellites: [{ id: 25544, name: 'ISS', highlight: true }],
        }),
      );
    });
    expect(result.current.catalog).not.toBeNull();
    expect(result.current.catalog?.satellites).toHaveLength(1);
  });

  it('updates latestTick + lastTickMs on each tick frame', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { result } = renderHook(() => useSatellitesStream('ws://test'));
    act(() => {
      sockets[0]!.fireOpen();
      sockets[0]!.fireMessage(
        JSON.stringify({
          v: 1,
          type: 'tick',
          seq: 7,
          ts: 't',
          epoch_ms: 0,
          satellites: [{ id: 25544, name: 'ISS', ecef_km: [1, 2, 3] }],
        }),
      );
    });
    expect(result.current.latestTick?.seq).toBe(7);
    expect(result.current.lastTickMs).toBe(1_700_000_000_000);
    spy.mockRestore();
  });

  it('ignores ping and bye frames in state (status only changes via socket events)', () => {
    const { result } = renderHook(() => useSatellitesStream('ws://test'));
    act(() => {
      sockets[0]!.fireOpen();
      sockets[0]!.fireMessage(JSON.stringify({ v: 1, type: 'ping', ts: 't' }));
      sockets[0]!.fireMessage(JSON.stringify({ v: 1, type: 'bye', reason: 'shutdown' }));
    });
    expect(result.current.latestTick).toBeNull();
    expect(result.current.catalog).toBeNull();
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => useSatellitesStream('ws://test'));
    expect(sockets).toHaveLength(1);
    unmount();
    expect(sockets[0]!.url).toBe('ws://test');
  });
});

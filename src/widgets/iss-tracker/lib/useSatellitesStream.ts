'use client';

import { useEffect, useRef, useState } from 'react';

import { ReconnectingWebSocket } from '@shared/lib/websocket';
import type { CatalogFrame, Frame, TickFrame, WsStatus } from '@shared/lib/websocket';

export interface SatellitesStreamState {
  status: WsStatus;
  catalog: CatalogFrame | null;
  latestTick: TickFrame | null;
  lastTickMs: number | null;
}

const INITIAL_STATE: SatellitesStreamState = {
  status: 'idle',
  catalog: null,
  latestTick: null,
  lastTickMs: null,
};

export default function useSatellitesStream(url: string | null): SatellitesStreamState {
  const [state, setState] = useState<SatellitesStreamState>(INITIAL_STATE);
  const wsRef = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    if (!url) return;
    if (typeof window === 'undefined') return;

    const ws = new ReconnectingWebSocket(url);
    wsRef.current = ws;

    ws.onStatusChange((status: WsStatus) => {
      setState((prev) => (prev.status === status ? prev : { ...prev, status }));
    });

    ws.onFrame((frame: Frame) => {
      switch (frame.type) {
        case 'catalog':
          setState((prev) => ({ ...prev, catalog: frame }));
          break;
        case 'tick':
          setState((prev) => ({ ...prev, latestTick: frame, lastTickMs: Date.now() }));
          break;
        case 'bye':
        case 'ping':
          break;
      }
    });

    ws.connect();

    return () => {
      ws.onFrame(null);
      ws.onStatusChange(null);
      ws.close();
      wsRef.current = null;
    };
  }, [url]);

  return state;
}

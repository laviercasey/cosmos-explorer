export const FRAME_V = 1;

export interface SatPosition {
  id: number;
  name: string;
  ecefKm: readonly [number, number, number];
  velKms?: readonly [number, number, number];
  altKm?: number;
}

export interface TickFrame {
  v: 1;
  type: 'tick';
  seq: number;
  ts: string;
  epoch_ms: number;
  satellites: readonly SatPosition[];
}

export interface CatalogEntry {
  id: number;
  name: string;
  color_hint?: string;
  highlight?: boolean;
}

export interface CatalogFrame {
  v: 1;
  type: 'catalog';
  satellites: readonly CatalogEntry[];
}

export interface ByeFrame {
  v: 1;
  type: 'bye';
  reason?: string;
  retry_after_ms?: number;
}

export interface PingFrame {
  v: 1;
  type: 'ping';
  ts: string;
}

export type Frame = TickFrame | CatalogFrame | ByeFrame | PingFrame;

export type WsStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

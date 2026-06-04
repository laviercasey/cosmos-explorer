import parseFrame from './parseFrame';
import type { Frame, WsStatus } from './types';

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;
const JITTER_FACTOR = 0.25;

export type FrameHandler = (frame: Frame) => void;
export type StatusHandler = (status: WsStatus) => void;

export interface ReconnectingWebSocketOptions {
  WebSocketCtor?: typeof WebSocket;

  random?: () => number;
}

export default class ReconnectingWebSocket {
  private readonly _url: string;
  private readonly _WebSocketCtor: typeof WebSocket;
  private readonly _random: () => number;

  private _ws: WebSocket | null = null;
  private _attempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: WsStatus = 'idle';
  private _closedByUser = false;
  private _disposed = false;

  private _onFrame: FrameHandler | null = null;
  private _onStatus: StatusHandler | null = null;

  private readonly _onVisibilityChange: () => void;
  private readonly _onPageShow: (e: PageTransitionEvent) => void;
  private _visibilityBound = false;

  constructor(url: string, options: ReconnectingWebSocketOptions = {}) {
    this._url = url;
    this._WebSocketCtor =
      options.WebSocketCtor ?? (globalThis as { WebSocket?: typeof WebSocket }).WebSocket!;
    this._random = options.random ?? Math.random;

    this._onVisibilityChange = (): void => {
      if (this._disposed) return;
      if (typeof document === 'undefined') return;
      if (!document.hidden && this._ws === null && !this._closedByUser) {
        this._cancelReconnect();
        this._attempts = 0;
        this._connect();
      }
    };

    this._onPageShow = (e: PageTransitionEvent): void => {
      if (this._disposed) return;
      if (e.persisted && this._ws === null && !this._closedByUser) {
        this._cancelReconnect();
        this._attempts = 0;
        this._connect();
      }
    };
  }

  onFrame(handler: FrameHandler | null): void {
    this._onFrame = handler;
  }

  onStatusChange(handler: StatusHandler | null): void {
    this._onStatus = handler;
    if (handler) handler(this._status);
  }

  status(): WsStatus {
    return this._status;
  }

  connect(): void {
    if (this._disposed) return;
    this._closedByUser = false;
    this._bindVisibility();
    if (this._ws !== null) return;
    if (this._reconnectTimer !== null) return;
    this._connect();
  }

  close(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._closedByUser = true;
    this._cancelReconnect();
    this._unbindVisibility();
    if (this._ws) {
      this._ws.onopen = null;
      this._ws.onclose = null;
      this._ws.onerror = null;
      this._ws.onmessage = null;
      try {
        this._ws.close(1000, 'client_close');
      } catch (_e) {
        void _e;
      }
      this._ws = null;
    }
    this._setStatus('closed');
  }

  private _connect(): void {
    if (this._disposed) return;
    if (typeof document !== 'undefined' && document.hidden) {
      this._scheduleReconnect();
      return;
    }
    this._setStatus(this._attempts === 0 ? 'connecting' : 'reconnecting');
    let ws: WebSocket;
    try {
      ws = new this._WebSocketCtor(this._url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this._ws = ws;

    ws.onopen = (): void => {
      this._attempts = 0;
      this._setStatus('open');
    };

    ws.onmessage = (event: MessageEvent): void => {
      if (typeof event.data !== 'string') return;
      const frame = parseFrame(event.data);
      if (frame && this._onFrame) this._onFrame(frame);
    };

    ws.onerror = (): void => {
    };

    ws.onclose = (): void => {
      this._ws = null;
      if (this._closedByUser || this._disposed) return;
      this._scheduleReconnect();
    };
  }

  private _scheduleReconnect(): void {
    if (this._disposed || this._closedByUser) return;
    if (this._reconnectTimer !== null) return;

    const exp = Math.min(BASE_DELAY_MS * 2 ** this._attempts, MAX_DELAY_MS);
    const jitter = 1 - JITTER_FACTOR + this._random() * (2 * JITTER_FACTOR);
    const delay = Math.round(exp * jitter);
    this._attempts += 1;

    this._setStatus('reconnecting');
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, delay);
  }

  private _cancelReconnect(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  private _setStatus(next: WsStatus): void {
    if (this._status === next) return;
    this._status = next;
    if (this._onStatus) this._onStatus(next);
  }

  private _bindVisibility(): void {
    if (this._visibilityBound) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('pageshow', this._onPageShow);
    this._visibilityBound = true;
  }

  private _unbindVisibility(): void {
    if (!this._visibilityBound) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('pageshow', this._onPageShow);
    this._visibilityBound = false;
  }
}

'use client';

import { useEffect, useRef, useState } from 'react';

import { subscribeScene } from '@shared/lib/scene';
import type { SceneManagerLike } from '@shared/lib/scene';

import SatelliteRenderer from '../lib/SatelliteRenderer';
import useSatellitesStream from '../lib/useSatellitesStream';

import ConnectionStatusBadge from './ConnectionStatusBadge';

function resolveWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (origin && origin.length > 0) {
    return `${origin.replace(/^http/, 'ws').replace(/\/$/, '')}/ws/iss`;
  }
  return 'ws://localhost:8080/ws/iss';
}

export default function IssTracker() {
  const [wsUrl, setWsUrl] = useState<string>('');
  useEffect(() => {
    setWsUrl(resolveWsUrl());
  }, []);

  const { status, catalog, latestTick, lastTickMs } = useSatellitesStream(wsUrl);

  const rendererRef = useRef<SatelliteRenderer | null>(null);
  const [sceneReady, setSceneReady] = useState<SceneManagerLike | null>(null);

  useEffect(() => {
    const unsub = subscribeScene((scene) => setSceneReady(scene));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!sceneReady || !catalog) return;
    const r = new SatelliteRenderer();
    const ok = r.mount(sceneReady, catalog.satellites);
    if (!ok) {
      r.dispose();
      return;
    }
    rendererRef.current = r;
    return () => {
      r.dispose();
      if (rendererRef.current === r) rendererRef.current = null;
    };
  }, [sceneReady, catalog]);

  useEffect(() => {
    if (!latestTick) return;
    const r = rendererRef.current;
    if (!r) return;
    r.update(latestTick, lastTickMs ?? Date.now());
  }, [latestTick, lastTickMs]);

  useEffect(() => {
    let frameId: number | null = null;
    let cancelled = false;
    const loop = (): void => {
      if (cancelled) return;
      const r = rendererRef.current;
      if (r) r.tickFade(Date.now());
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const ageMs = lastTickMs !== null ? Math.max(0, nowMs - lastTickMs) : null;

  return <ConnectionStatusBadge status={status} lastTickAgeMs={ageMs} />;
}

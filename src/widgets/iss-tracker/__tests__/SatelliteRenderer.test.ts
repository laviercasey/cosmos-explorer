import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogEntry, TickFrame } from '@shared/lib/websocket';
import type { SceneManagerLike } from '@shared/lib/scene';

import SatelliteRenderer from '../lib/SatelliteRenderer';

function makeMockScene(): {
  scene: SceneManagerLike;
  earth: THREE.Group;
  canvas: HTMLCanvasElement;
} {
  const earth = new THREE.Group();
  const canvas = document.createElement('canvas');
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

  const scene: SceneManagerLike = {
    init: () => Promise.resolve(),
    dispose: () => {},
    onResize: () => {},
    focusPlanet: () => {},
    returnToSystem: () => {},
    getFocusedIndex: () => null,
    setTimeScale: () => {},
    startMissionSim: () => {},
    stopMissionSim: () => {},
    setMissionSimSpeed: () => {},
    getEarthGroup: () => earth,
    getEarthRadiusUnits: () => 1,
    getCamera: () => camera,
    getRendererDom: () => canvas,
    onPlanetClick: null,
    onWarpStart: null,
    onWarpEnd: null,
    onMissionSimUpdate: null,
  };
  return { scene, earth, canvas };
}

const CATALOG: readonly CatalogEntry[] = [
  { id: 25544, name: 'ISS (ZARYA)', color_hint: '#44aaff', highlight: true },
  { id: 20580, name: 'Hubble' },
  { id: 48274, name: 'Tiangong' },
];

describe('SatelliteRenderer', () => {
  it('mount() returns false when Earth is unavailable', () => {
    const { scene } = makeMockScene();
    (scene as { getEarthGroup: () => THREE.Group | null }).getEarthGroup = () => null;
    const r = new SatelliteRenderer();
    expect(r.mount(scene, CATALOG)).toBe(false);
  });

  it('mount() attaches a group with N child meshes for N catalog entries', () => {
    const { scene, earth } = makeMockScene();
    const r = new SatelliteRenderer();
    expect(r.mount(scene, CATALOG)).toBe(true);
    expect(r.meshCount()).toBe(3);
    expect(earth.children).toContain(r.group());
    r.dispose();
  });

  it('mount() is idempotent', () => {
    const { scene } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    expect(r.mount(scene, CATALOG)).toBe(true);
    expect(r.meshCount()).toBe(3);
    r.dispose();
  });

  it('update() moves meshes to ECEF-derived scene positions', () => {
    const { scene } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    const tick: TickFrame = {
      v: 1,
      type: 'tick',
      seq: 1,
      ts: 't',
      epoch_ms: 0,
      satellites: [
        { id: 25544, name: 'ISS', ecefKm: [6371, 0, 0], altKm: 0 },
      ],
    };
    r.update(tick, 1000);
    const grp = r.group();
    const issMesh = grp.children[0] as THREE.Mesh;
    const pos = issMesh.position;
    const mag = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    expect(mag).toBeCloseTo(1, 4);
    r.dispose();
  });

  it('update() silently skips unknown satellite IDs', () => {
    const { scene } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    const tick: TickFrame = {
      v: 1,
      type: 'tick',
      seq: 1,
      ts: 't',
      epoch_ms: 0,
      satellites: [{ id: 99999, name: 'Unknown', ecefKm: [7000, 0, 0] }],
    };
    expect(() => r.update(tick, Date.now())).not.toThrow();
    r.dispose();
  });

  it('tickFade() ramps opacity for stale satellites', () => {
    const { scene } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    const now = 10_000;
    const tick: TickFrame = {
      v: 1,
      type: 'tick',
      seq: 1,
      ts: 't',
      epoch_ms: 0,
      satellites: [{ id: 25544, name: 'ISS', ecefKm: [6371, 0, 0] }],
    };
    r.update(tick, now);
    const grp = r.group();
    let issMat: THREE.MeshBasicMaterial | null = null;
    grp.children[0]?.traverse((child) => {
      if (issMat) return;
      if (child instanceof THREE.Mesh) {
        issMat = child.material as THREE.MeshBasicMaterial;
      }
    });
    if (!issMat) throw new Error('no body mesh material found');
    const issMatRef = issMat as THREE.MeshBasicMaterial;

    r.tickFade(now + 4_000);
    expect(issMatRef.opacity).toBeCloseTo(1, 4);

    r.tickFade(now + 5_500);
    expect(issMatRef.opacity).toBeCloseTo(0.75, 2);

    r.tickFade(now + 10_000);
    expect(issMatRef.opacity).toBeCloseTo(0.5, 4);

    r.tickFade(now + 40_000);
    expect(issMatRef.opacity).toBeGreaterThanOrEqual(0.05);
    expect(issMatRef.opacity).toBeLessThanOrEqual(0.35);

    r.dispose();
  });

  it('setCatalog() adds, removes, and re-colors meshes', () => {
    const { scene } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    expect(r.meshCount()).toBe(3);

    r.setCatalog([
      { id: 25544, name: 'ISS (ZARYA)', color_hint: '#ff0000', highlight: true },
      { id: 48274, name: 'Tiangong' },
      { id: 12345, name: 'NewSat' },
    ]);
    expect(r.meshCount()).toBe(3);

    r.dispose();
  });

  it('dispose() removes the group from Earth and frees GPU resources', () => {
    const { scene, earth } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    expect(earth.children.length).toBeGreaterThan(0);
    r.dispose();
    expect(earth.children).not.toContain(r.group());
    expect(r.meshCount()).toBe(0);
  });

  it('attaches pointermove + pointerleave listeners on the renderer canvas', () => {
    const { scene, canvas } = makeMockScene();
    const addSpy = vi.spyOn(canvas, 'addEventListener');
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    const events = addSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain('pointermove');
    expect(events).toContain('pointerleave');
    r.dispose();
  });

  it('removes pointer listeners on dispose', () => {
    const { scene, canvas } = makeMockScene();
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    r.dispose();
    const events = removeSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain('pointermove');
    expect(events).toContain('pointerleave');
  });

  it('pointer move dispatches without throwing (no intersection in default view)', () => {
    const { scene, canvas } = makeMockScene();
    const r = new SatelliteRenderer();
    r.mount(scene, CATALOG);
    const evt = new MouseEvent('pointermove', { clientX: 10, clientY: 10 });
    Object.defineProperty(evt, 'clientX', { value: 10 });
    Object.defineProperty(evt, 'clientY', { value: 10 });
    expect(() => canvas.dispatchEvent(evt)).not.toThrow();
    const leave = new MouseEvent('pointerleave');
    expect(() => canvas.dispatchEvent(leave)).not.toThrow();
    r.dispose();
  });
});

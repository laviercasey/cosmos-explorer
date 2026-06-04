import * as THREE from 'three';

import type { CatalogEntry, TickFrame } from '@shared/lib/websocket';
import type { SceneManagerLike } from '@shared/lib/scene';

import ecefKmToSceneVec3 from './ecefToScene';
import { createSatelliteShape } from './satelliteShapes';

interface SatMesh {
  id: number;
  name: string;
  altKm: number | null;
  baseColor: THREE.Color;
  object: THREE.Object3D;
  bodyMaterials: THREE.MeshBasicMaterial[];
  panelMaterials: THREE.MeshBasicMaterial[];
  lastUpdateMs: number;
}

const DEFAULT_COLOR = '#aabbdd';
const HIGHLIGHT_COLOR = '#44aaff';

const STALE_GRACE_MS = 5_000;
const STALE_FADED_MS = 30_000;
const STALE_FADED_OPACITY = 0.2;
const STALE_GRACE_OPACITY = 0.5;
const STALE_PULSE_PERIOD_MS = 1_400;
const STALE_PULSE_AMPLITUDE = 0.15;


class TooltipManager {
  private _el: HTMLDivElement | null = null;

  show(text: string, clientX: number, clientY: number): void {
    let el = this._el;
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('data-cosmos-sat-tooltip', '');
      Object.assign(el.style, {
        position: 'fixed',
        pointerEvents: 'none',
        padding: '6px 10px',
        background: 'rgba(0,4,16,0.92)',
        border: '1px solid rgba(68,170,255,0.35)',
        color: '#aabbdd',
        fontFamily: "'Courier New', monospace",
        fontSize: '11px',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        zIndex: '200',
        borderRadius: '2px',
        transform: 'translate(12px, -50%)',
        opacity: '0',
        transition: 'opacity 120ms ease-out',
      });
      document.body.appendChild(el);
      this._el = el;
    }
    el.textContent = text;
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
    el.style.opacity = '1';
  }

  hide(): void {
    if (!this._el) return;
    this._el.style.opacity = '0';
  }

  dispose(): void {
    if (this._el?.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
    this._el = null;
  }
}

export default class SatelliteRenderer {
  private readonly _group: THREE.Group = new THREE.Group();
  private readonly _satByMeshId = new Map<string, SatMesh>();
  private readonly _satById = new Map<number, SatMesh>();
  private _scene: SceneManagerLike | null = null;
  private _earthGroup: THREE.Group | null = null;
  private _earthRadiusUnits: number | null = null;

  private readonly _raycaster = new THREE.Raycaster();
  private readonly _ndc = new THREE.Vector2();
  private readonly _tooltip = new TooltipManager();
  private _hoverHandlerBound: ((e: PointerEvent) => void) | null = null;
  private _leaveHandlerBound: (() => void) | null = null;
  private _hoveredId: number | null = null;

  mount(scene: SceneManagerLike, catalog: readonly CatalogEntry[]): boolean {
    if (this._scene) return true;
    const earth = scene.getEarthGroup();
    const radius = scene.getEarthRadiusUnits();
    if (!earth || radius === null) {
      return false;
    }

    this._scene = scene;
    this._earthGroup = earth;
    this._earthRadiusUnits = radius;

    this._group.name = 'iss-tracker-satellites';
    earth.add(this._group);

    for (const entry of catalog) {
      this._addSatellite(entry);
    }

    this._bindHover();
    return true;
  }

  setCatalog(catalog: readonly CatalogEntry[]): void {
    if (!this._scene) return;
    const keep = new Set<number>();
    for (const entry of catalog) {
      keep.add(entry.id);
      const existing = this._satById.get(entry.id);
      if (existing) {
        const color = new THREE.Color(entry.color_hint ?? DEFAULT_COLOR);
        existing.baseColor = color;
        for (const m of existing.bodyMaterials) m.color.copy(color);
        existing.name = entry.name;
      } else {
        this._addSatellite(entry);
      }
    }
    for (const [id, sat] of this._satById) {
      if (!keep.has(id)) this._removeSatellite(sat);
    }
  }

  update(tick: TickFrame, nowMs: number): void {
    if (!this._scene || this._earthRadiusUnits === null) return;
    for (const pos of tick.satellites) {
      const sat = this._satById.get(pos.id);
      if (!sat) continue;
      const vec = ecefKmToSceneVec3(pos.ecefKm, this._earthRadiusUnits);
      sat.object.position.copy(vec);
      sat.altKm = pos.altKm ?? null;
      sat.lastUpdateMs = nowMs;
      this._setOpacity(sat, 1);
    }
  }

  tickFade(nowMs: number): void {
    for (const sat of this._satById.values()) {
      const age = nowMs - sat.lastUpdateMs;
      if (age <= STALE_GRACE_MS) {
        this._setOpacity(sat, 1);
        continue;
      }
      if (age <= STALE_GRACE_MS + 1_000) {
        const t = (age - STALE_GRACE_MS) / 1_000;
        this._setOpacity(sat, 1 - t * (1 - STALE_GRACE_OPACITY));
        continue;
      }
      if (age <= STALE_FADED_MS) {
        this._setOpacity(sat, STALE_GRACE_OPACITY);
        continue;
      }
      const phase = (nowMs % STALE_PULSE_PERIOD_MS) / STALE_PULSE_PERIOD_MS;
      const pulse = Math.sin(phase * Math.PI * 2);
      this._setOpacity(sat, STALE_FADED_OPACITY + pulse * STALE_PULSE_AMPLITUDE * 0.5);
    }
  }

  dispose(): void {
    this._unbindHover();
    this._tooltip.dispose();
    if (this._earthGroup) {
      this._earthGroup.remove(this._group);
    }
    for (const sat of this._satById.values()) {
      this._disposeObject(sat.object);
      for (const m of sat.bodyMaterials) m.dispose();
      for (const m of sat.panelMaterials) m.dispose();
    }
    this._satById.clear();
    this._satByMeshId.clear();
    this._scene = null;
    this._earthGroup = null;
    this._earthRadiusUnits = null;
  }

  private _setOpacity(sat: SatMesh, value: number): void {
    for (const m of sat.bodyMaterials) m.opacity = value;
    for (const m of sat.panelMaterials) m.opacity = value;
  }

  private _disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      const anyObj = child as THREE.Mesh;
      if (anyObj.geometry && typeof anyObj.geometry.dispose === 'function') {
        anyObj.geometry.dispose();
      }
    });
  }

  meshCount(): number {
    return this._satById.size;
  }

  group(): THREE.Group {
    return this._group;
  }

  private _addSatellite(entry: CatalogEntry): void {
    const color = new THREE.Color(entry.color_hint ?? (entry.highlight ? HIGHLIGHT_COLOR : DEFAULT_COLOR));
    const shape = createSatelliteShape(entry.id, { color, highlight: entry.highlight ?? false });
    shape.object.userData.satId = entry.id;
    shape.object.userData.satName = entry.name;
    shape.object.traverse((child) => {
      child.userData.satId = entry.id;
    });
    this._group.add(shape.object);
    const sat: SatMesh = {
      id: entry.id,
      name: entry.name,
      altKm: null,
      baseColor: color,
      object: shape.object,
      bodyMaterials: shape.bodyMaterials,
      panelMaterials: shape.panelMaterials,
      lastUpdateMs: -Infinity,
    };
    this._satById.set(entry.id, sat);
    this._satByMeshId.set(shape.object.uuid, sat);
  }

  private _removeSatellite(sat: SatMesh): void {
    this._group.remove(sat.object);
    this._disposeObject(sat.object);
    for (const m of sat.bodyMaterials) m.dispose();
    for (const m of sat.panelMaterials) m.dispose();
    this._satById.delete(sat.id);
    this._satByMeshId.delete(sat.object.uuid);
  }

  private _bindHover(): void {
    if (!this._scene) return;
    const canvas = this._scene.getRendererDom();
    if (!canvas) return;

    this._hoverHandlerBound = (e: PointerEvent): void => this._onPointerMove(e, canvas);
    this._leaveHandlerBound = (): void => {
      this._hoveredId = null;
      this._tooltip.hide();
    };

    canvas.addEventListener('pointermove', this._hoverHandlerBound);
    canvas.addEventListener('pointerleave', this._leaveHandlerBound);
  }

  private _unbindHover(): void {
    if (!this._scene) return;
    const canvas = this._scene.getRendererDom();
    if (!canvas) return;
    if (this._hoverHandlerBound) {
      canvas.removeEventListener('pointermove', this._hoverHandlerBound);
      this._hoverHandlerBound = null;
    }
    if (this._leaveHandlerBound) {
      canvas.removeEventListener('pointerleave', this._leaveHandlerBound);
      this._leaveHandlerBound = null;
    }
  }

  private _onPointerMove(e: PointerEvent, canvas: HTMLCanvasElement): void {
    if (!this._scene) return;
    const camera = this._scene.getCamera();
    if (!camera) return;

    const rect = canvas.getBoundingClientRect();
    this._ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._ndc, camera);
    this._raycaster.params.Points.threshold = 0.05;
    const hits = this._raycaster.intersectObject(this._group, true);
    const first = hits[0];
    if (!first) {
      if (this._hoveredId !== null) {
        this._hoveredId = null;
        this._tooltip.hide();
      }
      return;
    }
    const satId = first.object.userData.satId as unknown;
    if (typeof satId !== 'number') return;
    const sat = this._satById.get(satId);
    if (!sat) return;
    this._hoveredId = sat.id;
    const altLabel = sat.altKm !== null ? `${sat.altKm.toFixed(0)} km` : '—';
    this._tooltip.show(`${sat.name}  ·  ${altLabel}`, e.clientX, e.clientY);
  }
}

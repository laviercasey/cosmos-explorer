import type * as THREE from 'three';

import type { Trajectory, TrajectoryPhase } from '@entities/mission/model/types';
import type { Planet, PlanetIndex } from '@entities/planet/model/types';

export interface SceneMissionSimUpdate {
  phase: TrajectoryPhase | null;
  progress: number;
}

export interface SceneCallbacks {
  onPlanetClick?: (index: PlanetIndex) => void;
  onWarpStart?: () => void;
  onWarpEnd?: () => void;
  onMissionSimUpdate?: (u: SceneMissionSimUpdate) => void;
}

export interface PlanetEntry {
  pivot: THREE.Group;
  group: THREE.Group;
  mesh: THREE.Mesh;
  orbitLine: THREE.Line;
  atmosphereMesh: THREE.Mesh | null;
  cloudMesh: THREE.Mesh | null;
  moonPivot: THREE.Group | null;
  config: Planet;
  update: (elapsedSeconds: number, timeScale: number, delta?: number) => void;
}

export interface SceneManagerLike {
  init(domElement: HTMLElement, planetsData?: readonly Planet[]): Promise<void>;
  dispose(): void;
  onResize(): void;
  focusPlanet(index: PlanetIndex): void;
  returnToSystem(): void;
  getFocusedIndex(): PlanetIndex | null;
  setTimeScale(multiplier: number): void;
  startMissionSim(trajectory: Trajectory): void;
  stopMissionSim(): void;
  setMissionSimSpeed(speed: number): void;
  isMissionSimActive?(): boolean;

  getEarthGroup(): THREE.Group | null;

  getEarthRadiusUnits(): number | null;

  getCamera(): THREE.PerspectiveCamera | null;

  getRendererDom(): HTMLCanvasElement | null;

  onPlanetClick: ((index: PlanetIndex) => void) | null;
  onWarpStart: (() => void) | null;
  onWarpEnd: (() => void) | null;
  onMissionSimUpdate: ((u: SceneMissionSimUpdate) => void) | null;
}

import * as THREE from 'three';

import type { Trajectory } from '@entities/mission/model/types';
import type { Planet, PlanetIndex } from '@entities/planet/model/types';

import CONSTANTS from '../../config/constants';
import createConstellations from './Constellations';
import MissionSimulator from './MissionSimulator';
import createPlanet, { createAsteroidBelt } from './PlanetFactory';
import setupPostProcessing from './PostProcessing';
import type { PostProcessingChain } from './PostProcessing';
import createSun from './SunFactory';
import type { SunEntry } from './SunFactory';
import type { PlanetEntry, SceneManagerLike, SceneMissionSimUpdate } from './types';

interface SpectralClass {
  frac: number;
  r: number;
  g: number;
  b: number;
}

function createStarSprite(): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get 2D canvas context');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createStarfield(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const spectralClasses: readonly SpectralClass[] = [
    { frac: 0.03, r: 0.64, g: 0.75, b: 1.0 },
    { frac: 0.07, r: 0.72, g: 0.83, b: 1.0 },
    { frac: 0.1, r: 0.88, g: 0.92, b: 1.0 },
    { frac: 0.12, r: 1.0, g: 0.98, b: 0.9 },
    { frac: 0.15, r: 1.0, g: 0.93, b: 0.75 },
    { frac: 0.23, r: 1.0, g: 0.76, b: 0.45 },
    { frac: 0.3, r: 1.0, g: 0.55, b: 0.35 },
  ];

  const cumulative: { threshold: number; r: number; g: number; b: number }[] = [];
  let acc = 0;
  for (const sc of spectralClasses) {
    acc += sc.frac;
    cumulative.push({ threshold: acc, r: sc.r, g: sc.g, b: sc.b });
  }

  const INNER = 600;
  const OUTER = 1200;

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = INNER + Math.random() * (OUTER - INNER);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const pick = Math.random();
    let sc = cumulative[cumulative.length - 1]!;
    for (const c of cumulative) {
      if (pick <= c.threshold) {
        sc = c;
        break;
      }
    }
    colors[i * 3] = sc.r;
    colors[i * 3 + 1] = sc.g;
    colors[i * 3 + 2] = sc.b;

    const rnd = Math.random();
    sizes[i] = rnd < 0.8 ? 1.5 : rnd < 0.95 ? 2.5 : 4.0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const sprite = createStarSprite();

  const mat = new THREE.PointsMaterial({
    map: sprite,
    alphaTest: 0.02,
    vertexColors: true,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.92,
    size: 1.8,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

interface MouseState {
  x: number;
  y: number;
}

export default class SceneManager implements SceneManagerLike {
  private _renderer: THREE.WebGLRenderer | null = null;
  private _scene: THREE.Scene | null = null;
  private _camera: THREE.PerspectiveCamera | null = null;
  private _clock: THREE.Clock = new THREE.Clock();
  private _animFrameId: number | null = null;
  private _container: HTMLElement | null = null;

  private _pp: PostProcessingChain | null = null;

  private _sun: SunEntry | null = null;
  private _planetEntries: PlanetEntry[] = [];
  private _asteroidBelt: THREE.InstancedMesh | null = null;
  private _starfield: THREE.Points | null = null;
  private _skybox: THREE.Mesh | null = null;
  private _constellations: THREE.Group | null = null;

  private _camTheta: number;
  private _camPhi: number;
  private _camRadius: number;
  private _targetTheta: number;
  private _targetPhi: number;
  private _targetRadius: number;
  private _lookTarget: THREE.Vector3;
  private _targetLook: THREE.Vector3;

  private _focusedIndex: PlanetIndex | null = null;

  private _timeScale = 1.0;
  private _elapsed = 0;

  private _raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();
  private _isDragging = false;
  private _mouseDownPos: MouseState = { x: 0, y: 0 };
  private _lastMouse: MouseState = { x: 0, y: 0 };

  private readonly _onMouseDown: (e: MouseEvent) => void;
  private readonly _onMouseMove: (e: MouseEvent) => void;
  private readonly _onMouseUp: () => void;
  private readonly _onWheel: (e: WheelEvent) => void;
  private readonly _onClick: (e: MouseEvent) => void;
  private readonly _onTouchStart: (e: TouchEvent) => void;
  private readonly _onTouchMove: (e: TouchEvent) => void;
  private readonly _onTouchEnd: (e: TouchEvent) => void;

  public onPlanetClick: ((index: PlanetIndex) => void) | null = null;
  public onWarpStart: (() => void) | null = null;
  public onWarpEnd: (() => void) | null = null;
  public onMissionSimUpdate: ((u: SceneMissionSimUpdate) => void) | null = null;

  private _warpActive = false;
  private _warpTimer = 0;

  private _missionSim: MissionSimulator | null = null;
  private _missionSimSpeed = 1.0;

  constructor() {
    this._camTheta = CONSTANTS.CAMERA_DEFAULT_THETA;
    this._camPhi = CONSTANTS.CAMERA_DEFAULT_PHI;
    this._camRadius = CONSTANTS.CAMERA_DEFAULT_RADIUS;
    this._targetTheta = CONSTANTS.CAMERA_DEFAULT_THETA;
    this._targetPhi = CONSTANTS.CAMERA_DEFAULT_PHI;
    this._targetRadius = CONSTANTS.CAMERA_DEFAULT_RADIUS;
    this._lookTarget = new THREE.Vector3(0, 0, 0);
    this._targetLook = new THREE.Vector3(0, 0, 0);

    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onClick = this._handleClick.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
  }

  init(domElement: HTMLElement, planetsData: readonly Planet[] = []): Promise<void> {
    this._container = domElement;
    const w = domElement.clientWidth || window.innerWidth;
    const h = domElement.clientHeight || window.innerHeight;

    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.4;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    domElement.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(CONSTANTS.BACKGROUND_COLOR);

    new THREE.TextureLoader().load('/textures/stars_8k.jpg', (tex: THREE.Texture) => {
      if (!this._scene) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      const skyGeo = new THREE.SphereGeometry(1800, 64, 64);
      const skyMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex } },
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform sampler2D map;
          varying vec2 vUv;
          void main() {
            vec3 col = texture2D(map, vUv).rgb;
            col = pow(col, vec3(0.75)) * 1.6;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      });
      this._skybox = new THREE.Mesh(skyGeo, skyMat);
      this._skybox.renderOrder = -1;
      this._scene.add(this._skybox);
    });

    this._camera = new THREE.PerspectiveCamera(
      CONSTANTS.CAMERA_FOV,
      w / h,
      CONSTANTS.CAMERA_NEAR,
      CONSTANTS.CAMERA_FAR,
    );
    this._updateCameraPosition();

    this._pp = setupPostProcessing(this._renderer, this._scene, this._camera);

    this._sun = createSun();
    this._scene.add(this._sun.group);
    this._scene.add(this._sun.ambientLight);

    this._starfield = createStarfield(CONSTANTS.STAR_COUNT);
    this._scene.add(this._starfield);

    this._constellations = createConstellations(1750);
    this._scene.add(this._constellations);

    const planets: readonly Planet[] = planetsData.length > 0 ? planetsData : [];

    for (const config of planets) {
      const entry = createPlanet(config);
      this._scene.add(entry.orbitLine);
      this._scene.add(entry.group);
      this._planetEntries.push(entry);
    }

    this._asteroidBelt = createAsteroidBelt();
    this._scene.add(this._asteroidBelt);

    const canvas = this._renderer.domElement;
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    canvas.addEventListener('click', this._onClick);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd);

    this._clock.start();
    this._animate();

    return Promise.resolve();
  }

  dispose(): void {
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }

    if (this._renderer) {
      const canvas = this._renderer.domElement;
      canvas.removeEventListener('mousedown', this._onMouseDown);
      canvas.removeEventListener('mousemove', this._onMouseMove);
      canvas.removeEventListener('mouseup', this._onMouseUp);
      canvas.removeEventListener('wheel', this._onWheel);
      canvas.removeEventListener('click', this._onClick);
      canvas.removeEventListener('touchstart', this._onTouchStart);
      canvas.removeEventListener('touchmove', this._onTouchMove);
      canvas.removeEventListener('touchend', this._onTouchEnd);

      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    if (this._scene) {
      this._scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry && typeof m.geometry.dispose === 'function') m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) {
            m.material.forEach((mt) => this._disposeMaterial(mt));
          } else {
            this._disposeMaterial(m.material);
          }
        }
      });
    }

    this._pp?.dispose();
    this._renderer?.dispose();

    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._pp = null;
    this._sun = null;
    this._planetEntries = [];
    this._asteroidBelt = null;
    this._starfield = null;
    this._skybox = null;
    this._constellations = null;
  }

  private _disposeMaterial(mat: THREE.Material | null | undefined): void {
    if (!mat) return;
    const extended = mat as THREE.Material & {
      map?: THREE.Texture | null;
      normalMap?: THREE.Texture | null;
      roughnessMap?: THREE.Texture | null;
      metalnessMap?: THREE.Texture | null;
      emissiveMap?: THREE.Texture | null;
    };
    if (extended.map) extended.map.dispose();
    if (extended.normalMap) extended.normalMap.dispose();
    if (extended.roughnessMap) extended.roughnessMap.dispose();
    if (extended.metalnessMap) extended.metalnessMap.dispose();
    if (extended.emissiveMap) extended.emissiveMap.dispose();
    mat.dispose();
  }

  onResize(): void {
    if (!this._renderer || !this._container || !this._camera) return;
    const w = this._container.clientWidth || window.innerWidth;
    const h = this._container.clientHeight || window.innerHeight;
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._pp?.onResize(w, h);
  }

  focusPlanet(index: PlanetIndex): void {
    if (index < 0 || index >= this._planetEntries.length) return;
    this._focusedIndex = index;
    const entry = this._planetEntries[index];
    if (!entry) return;
    const config = entry.config;
    const targetR = (config.visualRadius || 1) * 8;
    this._targetRadius = targetR;
    this._targetPhi = 1.2;
    this._warpActive = true;
    this._warpTimer = 0;
    if (this.onWarpStart) this.onWarpStart();
  }

  returnToSystem(): void {
    this._focusedIndex = null;
    this._targetRadius = CONSTANTS.CAMERA_DEFAULT_RADIUS;
    this._targetPhi = CONSTANTS.CAMERA_DEFAULT_PHI;
    this._targetLook.set(0, 0, 0);
    this._warpActive = true;
    this._warpTimer = 0;
    if (this.onWarpStart) this.onWarpStart();
  }

  nextPlanet(): PlanetIndex | null {
    if (this._focusedIndex === null) return null;
    const next = (this._focusedIndex + 1) % this._planetEntries.length;
    this.focusPlanet(next);
    return next;
  }

  prevPlanet(): PlanetIndex | null {
    if (this._focusedIndex === null) return null;
    const prev =
      (this._focusedIndex - 1 + this._planetEntries.length) % this._planetEntries.length;
    this.focusPlanet(prev);
    return prev;
  }

  getFocusedIndex(): PlanetIndex | null {
    return this._focusedIndex;
  }

  getEarthGroup(): THREE.Group | null {
    const earth = this._planetEntries.find((entry) => entry.config.slug === 'earth');
    return earth ? earth.group : null;
  }

  getEarthRadiusUnits(): number | null {
    const earth = this._planetEntries.find((entry) => entry.config.slug === 'earth');
    return earth ? earth.config.visualRadius : null;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this._camera;
  }

  getRendererDom(): HTMLCanvasElement | null {
    return this._renderer ? this._renderer.domElement : null;
  }

  setTimeScale(multiplier: number): void {
    this._timeScale = Math.max(0, Math.min(100, multiplier));
  }

  getTimeScale(): number {
    return this._timeScale;
  }

  getPlanetWorldPosition(index: PlanetIndex): { x: number; y: number; z: number } {
    if (index < 0 || index >= this._planetEntries.length) return { x: 0, y: 0, z: 0 };
    const entry = this._planetEntries[index];
    if (!entry) return { x: 0, y: 0, z: 0 };
    const vec = new THREE.Vector3();
    entry.mesh.getWorldPosition(vec);
    return { x: vec.x, y: vec.y, z: vec.z };
  }

  getPlanetScreenPosition(
    index: PlanetIndex,
    domWidth: number,
    domHeight: number,
  ): { x: number; y: number } {
    if (!this._camera) return { x: 0, y: 0 };
    const worldPos = this.getPlanetWorldPosition(index);
    const vec = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    vec.project(this._camera);
    return {
      x: (vec.x * 0.5 + 0.5) * domWidth,
      y: (1 - (vec.y * 0.5 + 0.5)) * domHeight,
    };
  }

  startMissionSim(trajectoryData: Trajectory): void {
    if (this._missionSim) this.stopMissionSim();
    if (!this._scene) return;

    this._setSolarSystemVisible(false);

    this._missionSim = new MissionSimulator(this._scene, trajectoryData);

    const [mx, , mz] = trajectoryData.moonPos;
    this._targetLook.set(mx * 0.45, 0, mz * 0.45);
    this._targetRadius = 16;
    this._targetPhi = 1.28;
    this._targetTheta = -0.55;
  }

  stopMissionSim(): void {
    if (!this._missionSim) return;
    this._missionSim.dispose();
    this._missionSim = null;

    this._setSolarSystemVisible(true);

    this._targetRadius = CONSTANTS.CAMERA_DEFAULT_RADIUS;
    this._targetPhi = CONSTANTS.CAMERA_DEFAULT_PHI;
    this._targetLook.set(0, 0, 0);
  }

  setMissionSimSpeed(speed: number): void {
    this._missionSimSpeed = speed;
  }

  isMissionSimActive(): boolean {
    return this._missionSim !== null;
  }

  private _setSolarSystemVisible(visible: boolean): void {
    if (this._sun) {
      this._sun.group.visible = visible;
      this._sun.ambientLight.visible = visible;
    }
    for (const entry of this._planetEntries) {
      entry.group.visible = visible;
      if (entry.orbitLine) entry.orbitLine.visible = visible;
    }
    if (this._asteroidBelt) this._asteroidBelt.visible = visible;
  }

  private _animate(): void {
    this._animFrameId = requestAnimationFrame(() => this._animate());

    const delta = this._clock.getDelta();
    const t = this._clock.getElapsedTime();

    this._elapsed += delta;

    if (this._missionSim) {
      this._missionSim.tick(delta, this._missionSimSpeed);

      const scPos = this._missionSim.getSpacecraftWorldPosition();
      this._targetLook.set(scPos.x * 0.6, scPos.y * 0.6, scPos.z * 0.6);

      if (this._missionSim.getProgress() >= 1) {
        this._missionSim.reset();
      }

      if (this.onMissionSimUpdate) {
        this.onMissionSimUpdate({
          phase: this._missionSim.getCurrentPhase(),
          progress: this._missionSim.getProgress(),
        });
      }
    }

    if (this._sun) {
      this._sun.update(t);
    }

    for (const entry of this._planetEntries) {
      entry.update(this._elapsed, this._timeScale, delta);
    }

    if (this._asteroidBelt) {
      this._asteroidBelt.rotation.y += delta * 0.002 * this._timeScale;
    }

    if (this._skybox) {
      this._skybox.rotation.y += delta * 0.0008;
    }
    if (this._constellations) {
      this._constellations.rotation.y += delta * 0.0008;
    }

    if (this._focusedIndex !== null && this._focusedIndex < this._planetEntries.length) {
      const worldPos = this.getPlanetWorldPosition(this._focusedIndex);
      this._targetLook.set(worldPos.x, worldPos.y, worldPos.z);
    }

    if (this._warpActive) {
      this._warpTimer += delta;
      if (this._warpTimer > 0.6) {
        this._warpActive = false;
        if (this.onWarpEnd) this.onWarpEnd();
      }
    }

    const lerp = CONSTANTS.CAMERA_LERP_SPEED;
    this._camRadius = this._camRadius + (this._targetRadius - this._camRadius) * lerp;
    this._camPhi = this._camPhi + (this._targetPhi - this._camPhi) * lerp;
    this._camTheta = this._camTheta + (this._targetTheta - this._camTheta) * lerp;
    this._lookTarget.lerp(this._targetLook, lerp);

    this._updateCameraPosition();

    if (this._pp) {
      this._pp.render();
    }
  }

  private _updateCameraPosition(): void {
    if (!this._camera) return;
    const phi = this._camPhi;
    const theta = this._camTheta;
    const radius = this._camRadius;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    this._camera.position.set(
      this._lookTarget.x + x,
      this._lookTarget.y + y,
      this._lookTarget.z + z,
    );
    this._camera.lookAt(this._lookTarget);
  }

  private _handleMouseDown(e: MouseEvent): void {
    this._isDragging = false;
    this._mouseDownPos = { x: e.clientX, y: e.clientY };
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }

  private _handleMouseMove(e: MouseEvent): void {
    if (e.buttons === 0) return;
    const dx = e.clientX - this._lastMouse.x;
    const dy = e.clientY - this._lastMouse.y;
    const dist = Math.sqrt(
      Math.pow(e.clientX - this._mouseDownPos.x, 2) +
        Math.pow(e.clientY - this._mouseDownPos.y, 2),
    );
    if (dist > 3) this._isDragging = true;

    this._targetTheta -= dx * 0.005;
    this._targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this._targetPhi + dy * 0.005));
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }

  private _handleMouseUp(): void {

  }

  private _handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.08 : 0.92;
    this._targetRadius = Math.max(3, Math.min(500, this._targetRadius * delta));
  }

  private _handleClick(e: MouseEvent): void {
    if (this._isDragging) return;
    if (!this._renderer || !this._camera) return;

    const rect = this._renderer.domElement.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera);

    const planetMeshes = this._planetEntries.map((en) => en.mesh);
    const hits = this._raycaster.intersectObjects(planetMeshes, false);

    const first = hits[0];
    if (first) {
      const idx = first.object.userData.planetIndex as unknown;
      if (typeof idx === 'number' && this.onPlanetClick) {
        this.onPlanetClick(idx);
      }
    }
  }

  private _pinchStartDist = 0;
  private _pinchStartRadius = 0;

  private _handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        this._pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        this._pinchStartRadius = this._targetRadius;
        this._isDragging = true;
      }
      return;
    }
    const touch = e.touches[0];
    if (e.touches.length === 1 && touch) {
      this._mouseDownPos = { x: touch.clientX, y: touch.clientY };
      this._lastMouse = { x: touch.clientX, y: touch.clientY };
      this._isDragging = false;
    }
  }

  private _handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2 && this._pinchStartDist > 0) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = this._pinchStartDist / dist;
        this._targetRadius = Math.max(3, Math.min(500, this._pinchStartRadius * ratio));
      }
      return;
    }
    const touch = e.touches[0];
    if (e.touches.length === 1 && touch) {
      const dx = touch.clientX - this._lastMouse.x;
      const dy = touch.clientY - this._lastMouse.y;
      const dist = Math.sqrt(
        Math.pow(touch.clientX - this._mouseDownPos.x, 2) +
          Math.pow(touch.clientY - this._mouseDownPos.y, 2),
      );
      if (dist > 5) this._isDragging = true;

      this._targetTheta -= dx * 0.005;
      this._targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this._targetPhi + dy * 0.005));
      this._lastMouse = { x: touch.clientX, y: touch.clientY };
    }
  }

  private _handleTouchEnd(e: TouchEvent): void {
    if (!this._isDragging && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      if (!touch || !this._renderer || !this._camera) return;
      const rect = this._renderer.domElement.getBoundingClientRect();
      this._mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this._mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      this._raycaster.setFromCamera(this._mouse, this._camera);
      const planetMeshes = this._planetEntries.map((en) => en.mesh);
      const hits = this._raycaster.intersectObjects(planetMeshes, false);
      const first = hits[0];
      if (first) {
        const idx = first.object.userData.planetIndex as unknown;
        if (typeof idx === 'number' && this.onPlanetClick) {
          this.onPlanetClick(idx);
        }
      }
    }
  }
}

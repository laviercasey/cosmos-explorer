import * as THREE from 'three';

import type { Trajectory, TrajectoryPhase } from '@entities/mission/model/types';

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get 2D canvas context');
  return ctx;
}

function makeEarthTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = get2dContext(c);
  ctx.fillStyle = '#1a4a8a';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#2d6e3e';
  const blobs: readonly (readonly [number, number, number, number, number])[] = [
    [80, 100, 35, 50, -0.3],
    [145, 110, 28, 38, 0.2],
    [60, 162, 42, 28, 0.0],
    [172, 78, 32, 22, 0.5],
    [200, 138, 22, 32, -0.2],
    [120, 160, 30, 20, 0.1],
  ];
  for (const [x, y, rx, ry, rot] of blobs) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ddeeff';
  ctx.beginPath();
  ctx.ellipse(128, 10, 80, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(128, 246, 70, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(100, 65, 65, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(175, 150, 52, 7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(50, 130, 40, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

function makeMoonTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = get2dContext(c);
  ctx.fillStyle = '#9a9a8a';
  ctx.fillRect(0, 0, s, s);
  const rng = (n: number): number => n * 0.5 + Math.sin(n * 13.7) * 0.4;
  for (let i = 0; i < 18; i++) {
    const x = rng(i * 3.1 + 1) * s;
    const y = rng(i * 1.7 + 0.5) * s;
    const r = 2 + rng(i * 2.3) * 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${String(0.1 + rng(i) * 0.15)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(210,210,190,0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

interface EarthBuild {
  group: THREE.Group;
  mesh: THREE.Mesh;
}

function buildEarth(): EarthBuild {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.8, 40, 40);
  const mat = new THREE.MeshStandardMaterial({
    map: makeEarthTexture(),
    roughness: 0.65,
    metalness: 0.0,
    emissive: new THREE.Color(0x112244),
    emissiveIntensity: 0.12,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  const atmGeo = new THREE.SphereGeometry(0.88, 32, 32);
  const atmMat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.07,
    side: THREE.BackSide,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(atmGeo, atmMat));

  return { group, mesh };
}

function buildMoon(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.22, 24, 24);
  const mat = new THREE.MeshStandardMaterial({
    map: makeMoonTexture(),
    roughness: 0.92,
    metalness: 0.0,
  });
  return new THREE.Mesh(geo, mat);
}

interface SpacecraftBuild {
  group: THREE.Group;
  glowMat: THREE.MeshBasicMaterial;
}

function buildSpacecraft(): SpacecraftBuild {
  const group = new THREE.Group();

  const capGeo = new THREE.ConeGeometry(0.038, 0.11, 8);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xaabbcc,
    roughness: 0.28,
    metalness: 0.72,
    emissive: 0x112233,
    emissiveIntensity: 0.25,
  });
  const capsule = new THREE.Mesh(capGeo, capMat);
  capsule.rotation.x = Math.PI;
  group.add(capsule);

  const smGeo = new THREE.CylinderGeometry(0.034, 0.038, 0.085, 8);
  const smMat = new THREE.MeshStandardMaterial({
    color: 0x778899,
    roughness: 0.42,
    metalness: 0.62,
  });
  const sm = new THREE.Mesh(smGeo, smMat);
  sm.position.y = 0.095;
  group.add(sm);

  const panGeo = new THREE.BoxGeometry(0.14, 0.002, 0.038);
  const panMat = new THREE.MeshStandardMaterial({
    color: 0x1144aa,
    roughness: 0.28,
    metalness: 0.22,
    emissive: 0x0033aa,
    emissiveIntensity: 0.45,
  });
  for (const dx of [-0.072, 0.072]) {
    const p = new THREE.Mesh(panGeo, panMat);
    p.position.set(dx, 0.095, 0);
    group.add(p);
  }

  const glowGeo = new THREE.SphereGeometry(0.022, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff8844,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.18;
  group.add(glow);

  return { group, glowMat };
}

export default class MissionSimulator {
  private readonly _scene: THREE.Scene;
  private readonly _data: Trajectory;
  private readonly _group: THREE.Group;
  private _t: number;
  private _playing: boolean;
  private readonly _trailMax: number;
  private _trailCount: number;
  private _lastTrailT: number;
  private readonly _curve: THREE.CatmullRomCurve3;
  private _earthGroup!: THREE.Group;
  private _moonMesh!: THREE.Mesh;
  private _scGroup!: THREE.Group;
  private _glowMat!: THREE.MeshBasicMaterial;
  private _trailPositions!: Float32Array;
  private _trailLine!: THREE.Line;

  constructor(scene: THREE.Scene, data: Trajectory) {
    this._scene = scene;
    this._data = data;
    this._group = new THREE.Group();
    this._t = 0;
    this._playing = true;

    const TRAIL_MAX = 350;
    this._trailMax = TRAIL_MAX;
    this._trailCount = 0;
    this._lastTrailT = -1;

    const pts = data.waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this._curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);

    this._buildScene();
    scene.add(this._group);
  }

  private _buildScene(): void {
    const { moonPos } = this._data;

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-30, 18, -25);
    this._group.add(sun);
    this._group.add(new THREE.AmbientLight(0x112233, 0.5));

    const earth = buildEarth();
    this._earthGroup = earth.group;
    this._group.add(this._earthGroup);

    this._moonMesh = buildMoon();
    this._moonMesh.position.set(moonPos[0], moonPos[1], moonPos[2]);
    this._group.add(this._moonMesh);

    const moonDist = Math.sqrt(moonPos[0] ** 2 + moonPos[2] ** 2);
    const orbitPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(moonDist * Math.cos(a), 0, moonDist * Math.sin(a)));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    this._group.add(new THREE.Line(orbitGeo, orbitMat));

    const sc = buildSpacecraft();
    this._scGroup = sc.group;
    this._glowMat = sc.glowMat;
    this._group.add(this._scGroup);

    this._trailPositions = new Float32Array(this._trailMax * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this._trailPositions, 3));
    trailGeo.setDrawRange(0, 0);
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this._trailLine = new THREE.Line(trailGeo, trailMat);
    this._group.add(this._trailLine);
  }

  getProgress(): number {
    return this._t;
  }

  getSpacecraftWorldPosition(): THREE.Vector3 {
    return this._scGroup.position.clone();
  }

  getCurrentPhase(): TrajectoryPhase | null {
    const t = this._t;
    for (const ph of this._data.phases) {
      if (t >= ph.t[0] && t < ph.t[1]) return ph;
    }
    return this._data.phases[this._data.phases.length - 1] ?? null;
  }

  reset(): void {
    this._t = 0;
    this._trailCount = 0;
    this._lastTrailT = -1;
    this._trailLine.geometry.setDrawRange(0, 0);
  }

  private _rotateY(x: number, y: number, z: number, angle: number): THREE.Vector3 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new THREE.Vector3(x * c - z * s, y, x * s + z * c);
  }

  tick(delta: number, speed: number): void {
    if (this._playing) {
      this._t += (delta * speed) / this._data.simDuration;
      if (this._t >= 1) this._t = 1;
    }

    const t = this._t;
    const moonArc = t * (this._data.moonOrbitArc || 0);

    const rawPos = this._curve.getPoint(t);
    const pos = this._rotateY(rawPos.x, rawPos.y, rawPos.z, moonArc);
    this._scGroup.position.copy(pos);

    if (t < 0.998) {
      const rawAhead = this._curve.getPoint(Math.min(t + 0.008, 1));
      const arcAhead = Math.min(t + 0.008, 1) * (this._data.moonOrbitArc || 0);
      const ahead = this._rotateY(rawAhead.x, rawAhead.y, rawAhead.z, arcAhead);
      const dir = new THREE.Vector3().subVectors(ahead, pos);
      if (dir.lengthSq() > 0.000001) {
        dir.normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        this._scGroup.quaternion.copy(quat);
      }
    }

    const [mx, my, mz] = this._data.moonPos;
    const moonWorld = this._rotateY(mx, my, mz, moonArc);
    this._moonMesh.position.copy(moonWorld);

    const burning = (t >= 0.24 && t <= 0.38) || (t >= 0.88 && t <= 1.0);
    this._glowMat.opacity = burning ? 0.6 + 0.3 * Math.abs(Math.sin(t * 80)) : 0;

    this._earthGroup.rotation.y += delta * 0.14;
    this._moonMesh.rotation.y += delta * 0.025;

    const trailStep = 1 / this._trailMax;
    if (t - this._lastTrailT >= trailStep && this._trailCount < this._trailMax) {
      const off = this._trailCount * 3;
      this._trailPositions[off] = pos.x;
      this._trailPositions[off + 1] = pos.y;
      this._trailPositions[off + 2] = pos.z;
      this._trailCount++;
      this._lastTrailT = t;
      const posAttr = this._trailLine.geometry.attributes.position;
      if (posAttr) posAttr.needsUpdate = true;
      this._trailLine.geometry.setDrawRange(0, this._trailCount);
    }
  }

  dispose(): void {
    this._scene.remove(this._group);
    this._group.traverse((obj) => {
      const anyObj = obj as THREE.Mesh;
      if (anyObj.geometry && typeof anyObj.geometry.dispose === 'function') {
        anyObj.geometry.dispose();
      }
      const mat = anyObj.material;
      if (mat) {
        const mats: THREE.Material[] = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          const withMap = m as THREE.Material & { map?: THREE.Texture | null };
          if (withMap.map) withMap.map.dispose();
          m.dispose();
        });
      }
    });
  }
}

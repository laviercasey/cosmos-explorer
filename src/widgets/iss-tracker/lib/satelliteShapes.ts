import * as THREE from 'three';

const ISS_NORAD = 25544;
const TIANGONG_NORAD = 48274;
const HUBBLE_NORAD = 20580;

const GLOBAL_SCALE = 2.4;

let _solarTex: THREE.Texture | null = null;
let _foilGoldTex: THREE.Texture | null = null;
let _foilSilverTex: THREE.Texture | null = null;
let _foilWhiteTex: THREE.Texture | null = null;

export interface SatelliteShape {
  readonly object: THREE.Object3D;
  readonly bodyMaterials: THREE.MeshBasicMaterial[];
  readonly panelMaterials: THREE.MeshBasicMaterial[];
}

interface BuildOptions {
  readonly color: THREE.Color;
  readonly highlight: boolean;
}

export function createSatelliteShape(norad: number, opts: BuildOptions): SatelliteShape {
  switch (norad) {
    case ISS_NORAD:
      return buildIss(opts);
    case TIANGONG_NORAD:
      return buildTiangong(opts);
    case HUBBLE_NORAD:
      return buildHubble(opts);
    default:
      return buildGeneric(opts);
  }
}

function solarPanelTexture(): THREE.Texture {
  if (_solarTex) return _solarTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0e1a3a';
    ctx.fillRect(0, 0, size, size);
    const cellW = size / 8;
    const cellH = size / 16;
    ctx.fillStyle = '#1d3370';
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
      }
    }
    ctx.strokeStyle = '#5688dd';
    ctx.lineWidth = 0.6;
    for (let x = 0; x <= 8; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, size);
      ctx.stroke();
    }
    for (let y = 0; y <= 16; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(size, y * cellH);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _solarTex = tex;
  return tex;
}

function foilTexture(palette: 'gold' | 'silver' | 'white'): THREE.Texture {
  const cached =
    palette === 'gold' ? _foilGoldTex : palette === 'silver' ? _foilSilverTex : _foilWhiteTex;
  if (cached) return cached;

  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const base =
      palette === 'gold' ? '#caa050' : palette === 'silver' ? '#b6bbc4' : '#dde2ec';
    const highlight =
      palette === 'gold' ? '#ffd97a' : palette === 'silver' ? '#e2e6ee' : '#ffffff';
    const shadow =
      palette === 'gold' ? '#6f5520' : palette === 'silver' ? '#6b7180' : '#9aa1b0';

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 280; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 3;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, Math.random() < 0.5 ? highlight : shadow);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.globalAlpha = 0.3;
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? shadow : highlight;
      ctx.fillRect(0, y, size, 1);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (palette === 'gold') _foilGoldTex = tex;
  else if (palette === 'silver') _foilSilverTex = tex;
  else _foilWhiteTex = tex;
  return tex;
}

function buildIss({ color, highlight }: BuildOptions): SatelliteShape {
  const scale = (highlight ? 2.0 : 1.4) * GLOBAL_SCALE;
  const group = new THREE.Group();
  const bodyMats: THREE.MeshBasicMaterial[] = [];
  const panelMats: THREE.MeshBasicMaterial[] = [];

  const trussMat = foiledBodyMat(color, 'silver');
  const truss = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.008), trussMat);
  group.add(truss);
  bodyMats.push(trussMat);

  const modMat = foiledBodyMat(color.clone().multiplyScalar(1.05), 'gold');
  const moduleSizes = [
    { x: -0.025, len: 0.028, r: 0.013 },
    { x: 0, len: 0.034, r: 0.014 },
    { x: 0.025, len: 0.028, r: 0.013 },
  ];
  for (const m of moduleSizes) {
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(m.r, m.r, m.len, 14), modMat);
    mod.rotation.z = Math.PI / 2;
    mod.position.set(m.x, 0, 0);
    group.add(mod);
  }
  bodyMats.push(modMat);

  const panelMat = solarPanelMat();
  const panelGeo = new THREE.PlaneGeometry(0.025, 0.06);
  const offsets: readonly (readonly [number, number])[] = [
    [-0.045, 0.03],
    [-0.045, -0.03],
    [0.045, 0.03],
    [0.045, -0.03],
  ];
  for (const [x, z] of offsets) {
    const p = new THREE.Mesh(panelGeo, panelMat);
    p.position.set(x, 0, z);
    p.rotation.x = Math.PI / 2;
    group.add(p);
  }
  panelMats.push(panelMat);

  group.scale.setScalar(scale);
  return { object: group, bodyMaterials: bodyMats, panelMaterials: panelMats };
}

function buildTiangong({ color, highlight }: BuildOptions): SatelliteShape {
  const scale = (highlight ? 1.8 : 1.3) * GLOBAL_SCALE;
  const group = new THREE.Group();
  const bodyMats: THREE.MeshBasicMaterial[] = [];
  const panelMats: THREE.MeshBasicMaterial[] = [];

  const coreMat = foiledBodyMat(color, 'white');
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 12), coreMat);
  core.rotation.z = Math.PI / 2;
  group.add(core);
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), coreMat);
  group.add(node);
  bodyMats.push(coreMat);

  const armMat = foiledBodyMat(color.clone().multiplyScalar(0.92), 'white');
  const armGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.04, 10);
  const arm1 = new THREE.Mesh(armGeo, armMat);
  arm1.position.set(0, 0, 0.028);
  group.add(arm1);
  const arm2 = new THREE.Mesh(armGeo, armMat);
  arm2.position.set(0, 0, -0.028);
  group.add(arm2);
  bodyMats.push(armMat);

  const panelMat = solarPanelMat();
  const panelGeo = new THREE.PlaneGeometry(0.06, 0.022);
  for (const x of [-0.058, 0.058]) {
    const p = new THREE.Mesh(panelGeo, panelMat);
    p.position.set(x, 0, 0);
    group.add(p);
  }
  panelMats.push(panelMat);

  group.scale.setScalar(scale);
  return { object: group, bodyMaterials: bodyMats, panelMaterials: panelMats };
}

function buildHubble({ color, highlight }: BuildOptions): SatelliteShape {
  const scale = (highlight ? 1.7 : 1.2) * GLOBAL_SCALE;
  const group = new THREE.Group();
  const bodyMats: THREE.MeshBasicMaterial[] = [];
  const panelMats: THREE.MeshBasicMaterial[] = [];

  const tubeMat = foiledBodyMat(color, 'silver');
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 14), tubeMat);
  group.add(tube);
  const apertureMat = bodyMat(color.clone().multiplyScalar(0.25));
  const aperture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.014, 0.014, 14, 1, true),
    apertureMat,
  );
  aperture.position.y = 0.046;
  group.add(aperture);
  bodyMats.push(tubeMat, apertureMat);

  const panelMat = solarPanelMat();
  const panelGeo = new THREE.PlaneGeometry(0.072, 0.026);
  const p1 = new THREE.Mesh(panelGeo, panelMat);
  p1.position.set(0.052, 0, 0);
  p1.rotation.y = Math.PI / 2;
  group.add(p1);
  const p2 = new THREE.Mesh(panelGeo, panelMat);
  p2.position.set(-0.052, 0, 0);
  p2.rotation.y = Math.PI / 2;
  group.add(p2);
  panelMats.push(panelMat);

  group.scale.setScalar(scale);
  return { object: group, bodyMaterials: bodyMats, panelMaterials: panelMats };
}

function buildGeneric({ color, highlight }: BuildOptions): SatelliteShape {
  const scale = (highlight ? 1.6 : 1.0) * GLOBAL_SCALE;
  const group = new THREE.Group();
  const bodyMats: THREE.MeshBasicMaterial[] = [];
  const panelMats: THREE.MeshBasicMaterial[] = [];

  const bodyMaterial = foiledBodyMat(color, 'gold');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, 0.026), bodyMaterial);
  group.add(body);
  bodyMats.push(bodyMaterial);

  const dishMat = bodyMat(color.clone().multiplyScalar(1.1));
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.014, 12, 1, true), dishMat);
  dish.position.y = 0.022;
  dish.rotation.x = Math.PI;
  group.add(dish);
  bodyMats.push(dishMat);

  const panelMat = solarPanelMat();
  const panelGeo = new THREE.PlaneGeometry(0.055, 0.022);
  for (const x of [-0.04, 0.04]) {
    const p = new THREE.Mesh(panelGeo, panelMat);
    p.position.set(x, 0, 0);
    group.add(p);
  }
  panelMats.push(panelMat);

  group.scale.setScalar(scale);
  return { object: group, bodyMaterials: bodyMats, panelMaterials: panelMats };
}

function bodyMat(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
  });
}

function foiledBodyMat(
  color: THREE.Color,
  palette: 'gold' | 'silver' | 'white',
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    map: foilTexture(palette),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
  });
}

function solarPanelMat(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color('#4a78dd'),
    map: solarPanelTexture(),
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });
}

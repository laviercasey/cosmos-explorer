import * as THREE from 'three';

import type { CanvasTexture, Planet, RingData } from '@entities/planet/model/types';

import OrbitalMechanics from './OrbitalMechanics';
import type { PlanetEntry } from './types';

type RandomFn = () => number;

function seededRand(seed: number): RandomFn {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function valueNoise2D(x: number, y: number, scale: number): number {
  const nx = x * scale;
  const ny = y * scale;
  return (
    (Math.sin(nx * 1.3 + ny * 0.9) * 0.5 +
      Math.sin(nx * 2.7 - ny * 2.1) * 0.25 +
      Math.sin(nx * 5.1 + ny * 4.3) * 0.125 +
      Math.sin(-nx * 9.7 + ny * 8.3) * 0.0625) *
      0.5 +
    0.5
  );
}

const TWO_PI = Math.PI * 2;
const TEX_W = 512;
const TEX_H = 256;

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get 2D canvas context');
  return ctx;
}

function paletteAt(palette: readonly string[], idx: number, fallback: number = 0): string {
  return palette[idx] ?? palette[fallback] ?? '#888888';
}

function generateCrateredTexture(config: Planet): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = get2dContext(canvas);
  const tex = config.canvasTexture;
  if (!tex) throw new Error('Missing canvasTexture config for planet');
  const { palette, noiseScale } = tex;
  const craterDensity = tex.craterDensity ?? 0.5;
  const isMars = config.slug === 'mars';
  const rand = seededRand(config.index * 7919 + 42);

  ctx.fillStyle = paletteAt(palette, 0);
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const imageData = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const data = imageData.data;

  for (let py = 0; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const u = px / TEX_W;
      const v = py / TEX_H;

      const n1 = valueNoise2D(u, v, noiseScale);
      const n2 = valueNoise2D(u + 100, v + 100, noiseScale * 2.1);
      const n3 = valueNoise2D(u - 50, v + 200, noiseScale * 0.5);
      const combined = n1 * 0.6 + n2 * 0.25 + n3 * 0.15;

      let col: [number, number, number];
      if (combined < 0.3) col = hexToRgb(paletteAt(palette, 2));
      else if (combined < 0.5) col = hexToRgb(paletteAt(palette, 0));
      else if (combined < 0.7) col = hexToRgb(paletteAt(palette, 1));
      else if (combined < 0.85) col = hexToRgb(paletteAt(palette, 4));
      else col = hexToRgb(paletteAt(palette, 3));

      const idx = (py * TEX_W + px) * 4;
      const bright = 0.9 + rand() * 0.2;
      data[idx] = Math.min(255, col[0] * bright);
      data[idx + 1] = Math.min(255, col[1] * bright);
      data[idx + 2] = Math.min(255, col[2] * bright);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  if (isMars) {
    const capH = Math.floor(TEX_H * 0.1);
    const topGrad = ctx.createLinearGradient(0, 0, 0, capH);
    topGrad.addColorStop(0, 'rgba(255,240,230,0.85)');
    topGrad.addColorStop(1, 'rgba(255,240,230,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, TEX_W, capH);
    const botGrad = ctx.createLinearGradient(0, TEX_H - capH, 0, TEX_H);
    botGrad.addColorStop(0, 'rgba(255,240,230,0)');
    botGrad.addColorStop(1, 'rgba(255,240,230,0.75)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, TEX_H - capH, TEX_W, capH);
  }

  const numCraters = Math.floor(craterDensity * 60);
  for (let c = 0; c < numCraters; c++) {
    const cx = rand() * TEX_W;
    const cy = rand() * TEX_H;
    const r = 3 + rand() * 18;
    const baseCol = hexToRgb(paletteAt(palette, 0));
    const darken = 0.55 + rand() * 0.2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.fillStyle = `rgba(${String(Math.floor(baseCol[0] * darken))},${String(Math.floor(baseCol[1] * darken))},${String(Math.floor(baseCol[2] * darken))},0.7)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${String(Math.min(255, Math.floor(baseCol[0] * 1.3)))},${String(Math.min(255, Math.floor(baseCol[1] * 1.3)))},${String(Math.min(255, Math.floor(baseCol[2] * 1.3)))},0.5)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

function generateBandedTexture(config: Planet): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = get2dContext(canvas);
  const tex = config.canvasTexture;
  if (!tex) throw new Error('Missing canvasTexture config');
  const { palette, noiseScale } = tex;
  const isJupiter = config.slug === 'jupiter';

  const imageData = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const data = imageData.data;

  for (let py = 0; py < TEX_H; py++) {
    const v = py / TEX_H;

    for (let px = 0; px < TEX_W; px++) {
      const u = px / TEX_W;

      const noiseShift = valueNoise2D(u * 0.3, v, noiseScale * 0.8) * 0.04 - 0.02;
      const vShifted = (v + noiseShift + 1.0) % 1.0;
      const bv2 =
        Math.sin(vShifted * Math.PI * 8 + Math.sin(vShifted * Math.PI * 3) * 0.5) * 0.5 + 0.5;
      const pi2 = Math.floor(bv2 * (palette.length - 1));
      const c2 = hexToRgb(paletteAt(palette, Math.min(pi2, palette.length - 1)));

      const bright = 0.88 + valueNoise2D(u, v, noiseScale * 2.0) * 0.24;

      const idx = (py * TEX_W + px) * 4;
      data[idx] = Math.min(255, c2[0] * bright);
      data[idx + 1] = Math.min(255, c2[1] * bright);
      data[idx + 2] = Math.min(255, c2[2] * bright);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  if (isJupiter) {
    const spotX = TEX_W * 0.55;
    const spotY = TEX_H * (1 - 0.23);
    const spotRx = 28;
    const spotRy = 18;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, spotRx, spotRy, 0, 0, TWO_PI);
    ctx.fillStyle = 'rgba(180,50,30,0.75)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, spotRx, spotRy, 0, 0, TWO_PI);
    ctx.strokeStyle = 'rgba(220,100,60,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  return new THREE.CanvasTexture(canvas);
}

function generateSwirledTexture(config: Planet): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = get2dContext(canvas);
  const tex = config.canvasTexture;
  if (!tex) throw new Error('Missing canvasTexture config');
  const { palette, noiseScale } = tex;
  const isVenus = config.slug === 'venus';

  const imageData = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const data = imageData.data;

  for (let py = 0; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const u = px / TEX_W;
      const v = py / TEX_H;

      const angle = u * TWO_PI;
      const radius = v;
      const swirl = isVenus ? 3.5 : 1.5;
      const su = u + Math.sin(radius * Math.PI * 4 + angle * swirl) * 0.1;
      const sv = v + Math.cos(radius * Math.PI * 3 - angle * swirl * 0.7) * 0.05;

      const n1 = valueNoise2D(su, sv, noiseScale);
      const n2 = valueNoise2D(su + 10, sv + 10, noiseScale * 1.7);
      const n3 = valueNoise2D(su - 5, sv - 5, noiseScale * 3.0);
      const combined = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;

      const pi = Math.floor(combined * (palette.length - 1));
      const col = hexToRgb(paletteAt(palette, Math.min(pi, palette.length - 1)));

      const bright = isVenus ? 0.85 + n2 * 0.3 : 0.93 + n1 * 0.14;

      const idx = (py * TEX_W + px) * 4;
      data[idx] = Math.min(255, col[0] * bright);
      data[idx + 1] = Math.min(255, col[1] * bright);
      data[idx + 2] = Math.min(255, col[2] * bright);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return new THREE.CanvasTexture(canvas);
}

function generateSpottedTexture(config: Planet): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = get2dContext(canvas);
  const tex = config.canvasTexture;
  if (!tex) throw new Error('Missing canvasTexture config');
  const { palette, noiseScale } = tex;
  const rand = seededRand(config.index * 2311 + 77);

  const imageData = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const data = imageData.data;

  const oceanDeep = hexToRgb(palette[0] ?? '#1a3a7a');
  const oceanMid = hexToRgb(palette[1] ?? '#1e4488');
  const landDark = hexToRgb(palette[2] ?? '#2a6633');
  const landLight = hexToRgb(palette[3] ?? '#3a8844');
  const sand = hexToRgb(palette[4] ?? '#c8b060');

  for (let py = 0; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const u = px / TEX_W;
      const v = py / TEX_H;

      const distFromPole = Math.min(v, 1.0 - v);
      const isPolar = distFromPole < 0.18;

      const n1 = valueNoise2D(u, v, noiseScale);
      const n2 = valueNoise2D(u * 1.8 + 5, v * 1.8 + 5, noiseScale * 2.0);
      const n3 = valueNoise2D(u * 3.5 - 3, v * 3.5 + 8, noiseScale * 4.0);
      const landNoise = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;

      let r: number;
      let g: number;
      let b: number;

      if (isPolar) {
        const poleBlend = 1.0 - distFromPole / 0.18;
        const oceanCol = hexToRgb(palette[0] ?? '#1a3a7a');
        r = oceanCol[0] + (255 - oceanCol[0]) * poleBlend * 0.9;
        g = oceanCol[1] + (255 - oceanCol[1]) * poleBlend * 0.9;
        b = oceanCol[2] + (255 - oceanCol[2]) * poleBlend * 0.9;
      } else if (landNoise > 0.52) {
        if (landNoise > 0.72) {
          r = sand[0];
          g = sand[1];
          b = sand[2];
        } else if (landNoise > 0.6) {
          r = landLight[0];
          g = landLight[1];
          b = landLight[2];
        } else {
          r = landDark[0];
          g = landDark[1];
          b = landDark[2];
        }
        const bv = 0.9 + n3 * 0.2;
        r = Math.min(255, r * bv);
        g = Math.min(255, g * bv);
        b = Math.min(255, b * bv);
      } else {
        const depth = landNoise / 0.52;
        const oc = depth > 0.6 ? oceanMid : oceanDeep;
        const bv = 0.92 + n2 * 0.16;
        r = Math.min(255, oc[0] * bv);
        g = Math.min(255, oc[1] * bv);
        b = Math.min(255, oc[2] * bv);
      }

      const idx = (py * TEX_W + px) * 4;
      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  for (let c = 0; c < 60; c++) {
    const cx = rand() * TEX_W;
    const cy = 0.1 * TEX_H + rand() * 0.8 * TEX_H;
    const rw = 8 + rand() * 40;
    const rh = 4 + rand() * 12;
    ctx.save();
    ctx.globalAlpha = 0.12 + rand() * 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, rand() * Math.PI, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  return new THREE.CanvasTexture(canvas);
}

function generateRingTexture(ringData: RingData): THREE.CanvasTexture {
  const RING_W = 1024;
  const RING_H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = RING_W;
  canvas.height = RING_H;
  const ctx = get2dContext(canvas);
  const rand = seededRand(54321);

  const imageData = ctx.getImageData(0, 0, RING_W, RING_H);
  const data = imageData.data;

  for (let px = 0; px < RING_W; px++) {
    const t = px / (RING_W - 1);

    let bandColor: [number, number, number] = [0, 0, 0];
    let bandOpacity = 0;

    for (const band of ringData.bands) {
      if (t >= band.start && t <= band.end) {
        bandColor = hexToRgb(band.color);
        bandOpacity = band.opacity;

        const edgeWidth = 0.012;
        const distToStart = t - band.start;
        const distToEnd = band.end - t;
        if (distToStart < edgeWidth) {
          bandOpacity *= distToStart / edgeWidth;
        } else if (distToEnd < edgeWidth) {
          bandOpacity *= distToEnd / edgeWidth;
        }
        break;
      }
    }

    const noise = 0.9 + rand() * 0.2;

    for (let py = 0; py < RING_H; py++) {
      const idx = (py * RING_W + px) * 4;
      data[idx] = Math.min(255, bandColor[0] * noise);
      data[idx + 1] = Math.min(255, bandColor[1] * noise);
      data[idx + 2] = Math.min(255, bandColor[2] * noise);
      data[idx + 3] = Math.floor(bandOpacity * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return new THREE.CanvasTexture(canvas);
}

function remapRingUVs(geometry: THREE.BufferGeometry, innerR: number, outerR: number): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute | undefined;
  const uv = geometry.attributes.uv as THREE.BufferAttribute | undefined;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const dist = Math.sqrt(x * x + z * z);
    const t = (dist - innerR) / (outerR - innerR);
    uv.setXY(i, Math.max(0, Math.min(1, t)), 0.5);
  }
  uv.needsUpdate = true;
}

interface AtmParams {
  color: [number, number, number];
  intensity: number;
  power: number;
}

const ATMOSPHERE_PARAMS: Record<string, AtmParams> = {
  venus: { color: [1.0, 0.8, 0.27], intensity: 0.65, power: 3.0 },
  earth: { color: [0.27, 0.6, 1.0], intensity: 0.55, power: 3.5 },
  jupiter: { color: [0.87, 0.6, 0.27], intensity: 0.35, power: 4.0 },
  saturn: { color: [0.93, 0.87, 0.53], intensity: 0.3, power: 4.0 },
  uranus: { color: [0.27, 0.93, 1.0], intensity: 0.45, power: 3.5 },
  neptune: { color: [0.27, 0.4, 1.0], intensity: 0.5, power: 3.0 },
};

export function createCanvasTexture(config: Planet): THREE.CanvasTexture {
  const tex = config.canvasTexture;
  if (!tex) return generateSpottedTexture(config);
  const technique = tex.technique;
  switch (technique) {
    case 'cratered':
      return generateCrateredTexture(config);
    case 'banded':
      return generateBandedTexture(config);
    case 'swirled':
      return generateSwirledTexture(config);
    case 'spotted':
      return generateSpottedTexture(config);
    default:
      return generateSpottedTexture(config);
  }
}

export function createAtmosphere(config: Planet): THREE.Mesh | null {
  if (!config.hasAtmosphereGlow) return null;

  const params = ATMOSPHERE_PARAMS[config.slug];
  if (!params) return null;

  const { color, intensity, power } = params;
  const radius = config.visualRadius * 1.18;

  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Vector3(color[0], color[1], color[2]) },
      intensity: { value: intensity },
      power: { value: power },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      uniform float power;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - dot(viewDir, vNormal);
        fresnel = pow(fresnel, power) * intensity;
        gl_FragColor = vec4(glowColor, fresnel);
      }
    `,
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Mesh(geo, mat);
}

export function createRings(config: Planet): THREE.Mesh | null {
  if (!config.hasRings || !config.ringData) return null;

  const ringData = config.ringData;
  const { visualRadius } = config;
  const innerR = visualRadius * ringData.innerRadiusScale;
  const outerR = visualRadius * ringData.outerRadiusScale;

  const geo = new THREE.RingGeometry(innerR, outerR, 128);
  remapRingUVs(geo, innerR, outerR);

  const realRingTex = new THREE.TextureLoader().load('/textures/saturn_ring.png');
  realRingTex.colorSpace = THREE.SRGBColorSpace;
  const ringTex = config.slug === 'saturn' ? realRingTex : generateRingTexture(ringData);
  const mat = new THREE.MeshBasicMaterial({
    map: ringTex,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function createAsteroidBelt(): THREE.InstancedMesh {
  const COUNT = 2500;
  const INNER = 31;
  const OUTER = 36;
  const rand = seededRand(11111);

  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x888880,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const instanced = new THREE.InstancedMesh(geo, mat, COUNT);
  instanced.castShadow = false;
  instanced.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < COUNT; i++) {
    const angle = rand() * TWO_PI;
    const radius = INNER + rand() * (OUTER - INNER);
    const y = (rand() - 0.5) * 1.8;

    dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

    dummy.rotation.set(rand() * TWO_PI, rand() * TWO_PI, rand() * TWO_PI);

    const large = rand() < 0.08;
    const base = large ? 0.18 + rand() * 0.22 : 0.06 + rand() * 0.1;
    dummy.scale.set(base, base * (0.6 + rand() * 0.8), base * (0.6 + rand() * 0.8));

    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    const brightness = 0.38 + rand() * 0.38;
    const redness = rand() * 0.12;
    color.setRGB(
      brightness + redness,
      brightness * (0.9 + rand() * 0.08),
      brightness * (0.8 + rand() * 0.1),
    );
    instanced.setColorAt(i, color);
  }

  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

  return instanced;
}

const PLANET_TEXTURES: Record<string, string> = {
  mercury: '/textures/mercury.jpg',
  venus: '/textures/venus_atmosphere.jpg',
  earth: '/textures/earth_daymap.jpg',
  mars: '/textures/mars.jpg',
  jupiter: '/textures/jupiter.jpg',
  saturn: '/textures/saturn.jpg',
  uranus: '/textures/uranus.jpg',
  neptune: '/textures/neptune.jpg',
};

export default function createPlanet(config: Planet): PlanetEntry {
  const orbitPoints = OrbitalMechanics.generateOrbitPath(config, 256);
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  const orbitMat = new THREE.LineBasicMaterial({
    color: 0x334466,
    transparent: true,
    opacity: 0.35,
  });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);

  const pivot = new THREE.Group();

  const loader = new THREE.TextureLoader();
  const texPath = PLANET_TEXTURES[config.slug];
  const texture: THREE.Texture = texPath
    ? loader.load(texPath)
    : (createCanvasTexture(config) as unknown as THREE.Texture);
  if (texPath) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  const geo = new THREE.SphereGeometry(config.visualRadius, 48, 48);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: new THREE.Color(config.emissiveHex),
    emissiveIntensity: 0.18,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.planetIndex = config.index;

  const atmosphereMesh = createAtmosphere(config);

  const group = new THREE.Group();
  group.add(mesh);
  if (atmosphereMesh) group.add(atmosphereMesh);

  const ringMesh = createRings(config);
  if (ringMesh) group.add(ringMesh);

  let cloudMesh: THREE.Mesh | null = null;
  if (config.hasCloudLayer) {
    const cloudGeo = new THREE.SphereGeometry(config.visualRadius * 1.03, 48, 48);
    const cloudTex = loader.load('/textures/earth_clouds.jpg');
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    const cloudMat = new THREE.MeshStandardMaterial({
      alphaMap: cloudTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      color: 0xffffff,
    });
    cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    group.add(cloudMesh);
  }

  let moonPivot: THREE.Group | null = null;
  if (config.slug === 'earth') {
    moonPivot = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(0.27, 32, 32);
    const moonTex = loader.load('/textures/moon.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0x111111),
      emissiveIntensity: 0.05,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(2.2, 0, 0);
    moonPivot.add(moonMesh);
    group.add(moonPivot);
  }

  pivot.add(group);

  const EARTH_ROT_SPEED = 0.5;
  const rotationSpeed =
    config.rotationPeriodHours !== 0
      ? EARTH_ROT_SPEED * (24 / Math.abs(config.rotationPeriodHours))
      : EARTH_ROT_SPEED;
  const rotationDir = config.rotationPeriodHours < 0 ? -1 : 1;

  const initPos = OrbitalMechanics.computeOrbitalPosition(config, 0);
  group.position.set(initPos.x, initPos.y, initPos.z);

  function update(elapsedSeconds: number, timeScale: number, delta = 0.016): void {
    const trueAnomaly = OrbitalMechanics.computeOrbitalAngle(config, elapsedSeconds, timeScale);
    const pos = OrbitalMechanics.computeOrbitalPosition(config, trueAnomaly);
    group.position.set(pos.x, pos.y, pos.z);

    mesh.rotation.y += rotationDir * rotationSpeed * timeScale * delta;

    if (cloudMesh) {
      cloudMesh.rotation.y += rotationDir * rotationSpeed * 1.3 * timeScale * delta;
    }

    if (moonPivot) {
      moonPivot.rotation.y += 0.3 * timeScale * delta;
    }
  }

  return {
    pivot,
    group,
    mesh,
    orbitLine,
    atmosphereMesh,
    cloudMesh,
    moonPivot,
    config,
    update,
  };
}

export type { CanvasTexture };

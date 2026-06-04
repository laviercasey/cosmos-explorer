import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get 2D canvas context');
  return ctx;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = get2dContext(c);
  const cx = S / 2;

  const radial = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  radial.addColorStop(0.0, 'rgba(255,255,230,1.0)');
  radial.addColorStop(0.04, 'rgba(255,240,160,0.95)');
  radial.addColorStop(0.12, 'rgba(255,190,60,0.70)');
  radial.addColorStop(0.28, 'rgba(255,120,20,0.35)');
  radial.addColorStop(0.55, 'rgba(255,70,5,0.12)');
  radial.addColorStop(1.0, 'rgba(200,40,0,0.00)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, S, S);

  ctx.globalCompositeOperation = 'lighter';
  const SPIKES = 6;
  for (let i = 0; i < SPIKES; i++) {
    const angle = (i / SPIKES) * Math.PI * 2 + 0.26;
    const halfW = 0.016;
    const length = cx * 0.94;

    const ax = cx + Math.cos(angle - halfW) * length;
    const ay = cx + Math.sin(angle - halfW) * length;
    const bx = cx + Math.cos(angle + halfW) * length;
    const by = cx + Math.sin(angle + halfW) * length;

    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.closePath();

    const tip = ctx.createLinearGradient(
      cx,
      cx,
      cx + Math.cos(angle) * length,
      cx + Math.sin(angle) * length,
    );
    tip.addColorStop(0.0, 'rgba(255,255,200,0.90)');
    tip.addColorStop(0.2, 'rgba(255,210,100,0.50)');
    tip.addColorStop(0.55, 'rgba(255,150,40,0.15)');
    tip.addColorStop(1.0, 'rgba(255,100,0,0.00)');
    ctx.fillStyle = tip;
    ctx.fill();
  }

  return new THREE.CanvasTexture(c);
}

function makeCircleTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = get2dContext(c);
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.2, 'rgba(255,220,120,0.8)');
  g.addColorStop(0.5, 'rgba(255,150,40,0.3)');
  g.addColorStop(1.0, 'rgba(255,80,0,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeRingTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = get2dContext(c);
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, cx * 0.55, cx, cx, cx * 0.9);
  g.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.4, 'rgba(180,210,255,0.6)');
  g.addColorStop(0.7, 'rgba(120,160,255,0.3)');
  g.addColorStop(1.0, 'rgba(80,120,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeHexTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = get2dContext(c);
  const cx = size / 2;
  const r = cx * 0.8;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    if (i === 0) {
      ctx.moveTo(cx + r * Math.cos(a), cx + r * Math.sin(a));
    } else {
      ctx.lineTo(cx + r * Math.cos(a), cx + r * Math.sin(a));
    }
  }
  ctx.closePath();

  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, r);
  g.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.6, 'rgba(180,200,255,0.25)');
  g.addColorStop(0.85, 'rgba(140,170,255,0.55)');
  g.addColorStop(1.0, 'rgba(100,140,255,0.0)');
  ctx.fillStyle = g;
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

export interface SunEntry {
  group: THREE.Group;
  pointLight: THREE.PointLight;
  ambientLight: THREE.AmbientLight;
  update: (elapsed: number) => void;
}

export default function createSun(): SunEntry {
  const group = new THREE.Group();

  const sunTexture = new THREE.TextureLoader().load('/textures/sun.jpg');
  sunTexture.colorSpace = THREE.SRGBColorSpace;

  const coreMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: sunTexture }, time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;

      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                   mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      float fbm(vec2 p){
        float v=0.0,a=0.5;
        for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
        return v;
      }

      void main() {
        vec4 tex = texture2D(map, vUv);
        float t1 = fbm(vUv*4.0 + vec2(time*0.012, time*0.008));
        float t2 = fbm(vUv*9.0 - vec2(time*0.007, time*0.005));
        vec3 hot  = vec3(1.0,0.95,0.55);
        vec3 cool = vec3(0.95,0.45,0.05);
        vec3 surf = mix(tex.rgb, hot, t1*0.35);
        surf = mix(surf, cool, (1.0-t2)*0.25);
        float limb = clamp(dot(vNormal,vec3(0,0,1)),0.0,1.0);
        surf *= (0.5 + 0.5*limb) * 2.2;
        gl_FragColor = vec4(surf, 1.0);
      }
    `,
  });

  const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(4.5, 64, 64), coreMat);
  group.add(coreMesh);

  const haloMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vViewPos;
      void main(){
        vNormal=normalize(normalMatrix*normal);
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        vViewPos=-mv.xyz;
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal; varying vec3 vViewPos;
      void main(){
        vec3 vd=normalize(vViewPos);
        float f=pow(1.0-dot(vd,vNormal),2.5);
        float p=1.0+0.08*sin(time*0.8);
        vec3 col=mix(vec3(1.0,0.7,0.1),vec3(1.0,0.3,0.0),f);
        gl_FragColor=vec4(col,f*0.85*p);
      }
    `,
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(5.2, 48, 48), haloMat));

  const glowTex = makeGlowTexture();
  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  glowSprite.scale.setScalar(55);
  group.add(glowSprite);

  const glowSprite2 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.25,
      rotation: Math.PI / 6,
    }),
  );
  glowSprite2.scale.setScalar(42);
  group.add(glowSprite2);

  const flareLight = new THREE.PointLight(0xfffae0, 0, 0);
  group.add(flareLight);

  const lensflare = new Lensflare();
  lensflare.addElement(
    new LensflareElement(makeCircleTexture(256), 420, 0.0, new THREE.Color(1.0, 0.85, 0.5)),
  );
  lensflare.addElement(
    new LensflareElement(makeRingTexture(256), 220, 0.0, new THREE.Color(1.0, 0.65, 0.25)),
  );
  lensflare.addElement(
    new LensflareElement(makeCircleTexture(64), 50, 0.35, new THREE.Color(0.8, 0.75, 1.0)),
  );
  lensflare.addElement(
    new LensflareElement(makeHexTexture(128), 75, 0.5, new THREE.Color(0.6, 0.75, 1.0)),
  );
  lensflare.addElement(
    new LensflareElement(makeCircleTexture(64), 35, 0.65, new THREE.Color(0.5, 0.65, 1.0)),
  );
  lensflare.addElement(
    new LensflareElement(makeHexTexture(128), 55, 0.8, new THREE.Color(0.45, 0.55, 1.0)),
  );
  lensflare.addElement(
    new LensflareElement(makeCircleTexture(64), 25, 1.0, new THREE.Color(0.7, 0.85, 1.0)),
  );

  flareLight.add(lensflare);

  const pointLight = new THREE.PointLight(0xfffae0, 6, 800);
  group.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0x8899bb, 2.0);

  function update(elapsed: number): void {
    const coreTime = coreMat.uniforms.time;
    if (coreTime) coreTime.value = elapsed;
    const haloTime = haloMat.uniforms.time;
    if (haloTime) haloTime.value = elapsed;

    coreMesh.rotation.y = elapsed * 0.04;

    glowSprite.material.rotation = elapsed * 0.025;
    glowSprite2.material.rotation = -elapsed * 0.018 + Math.PI / 6;
  }

  return { group, pointLight, ambientLight, update };
}

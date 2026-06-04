import * as THREE from 'three';

type StarCoords = readonly [raHours: number, decDeg: number];

const STARS: Record<string, StarCoords> = {

  Betelgeuse: [5.919, 7.407],
  Rigel: [5.242, -8.202],
  Bellatrix: [5.418, 6.35],
  Mintaka: [5.534, -0.299],
  Alnilam: [5.603, -1.202],
  Alnitak: [5.679, -1.943],
  Saiph: [5.796, -9.67],
  Meissa: [5.585, 9.934],

  Dubhe: [11.062, 61.751],
  Merak: [11.031, 56.382],
  Phecda: [11.897, 53.695],
  Megrez: [12.257, 57.033],
  Alioth: [12.9, 55.959],
  Mizar: [13.399, 54.925],
  Alkaid: [13.792, 49.313],

  Caph: [0.153, 59.15],
  Schedar: [0.675, 56.537],
  Gamma_Cas: [0.945, 60.717],
  Ruchbah: [1.43, 60.235],
  Segin: [1.906, 63.67],

  Regulus: [10.139, 11.967],
  Algieba: [10.333, 19.842],
  Eta_Leo: [10.122, 16.763],
  Zosma: [11.235, 20.524],
  Denebola: [11.818, 14.572],
  Chertan: [11.235, 15.43],

  Antares: [16.49, -26.432],
  Graffias: [16.091, -19.805],
  Dschubba: [16.005, -22.622],
  Shaula: [17.56, -37.104],
  Lesath: [17.531, -37.296],
  Sargas: [17.622, -42.998],
  Girtab: [17.793, -39.03],

  Deneb: [20.69, 45.28],
  Sadr: [20.37, 40.257],
  Gienah_Cyg: [20.77, 33.97],
  Delta_Cyg: [19.749, 45.131],
  Albireo: [19.512, 27.96],

  Vega: [18.615, 38.784],
  Sheliak: [18.834, 33.363],
  Sulafat: [18.982, 32.69],
  Zeta_Lyr: [18.746, 37.604],

  Castor: [7.576, 31.888],
  Pollux: [7.755, 28.026],
  Alhena: [6.629, 16.399],
  Mebsuda: [6.732, 25.131],
  Tejat: [6.383, 22.514],
  Wasat: [7.335, 21.983],
  Propus: [6.268, 22.507],

  Mirfak: [3.406, 49.861],
  Algol: [3.136, 40.957],
  Gamma_Per: [3.079, 53.506],
  Delta_Per: [3.716, 47.787],
  Epsilon_Per: [3.964, 40.01],

  Aldebaran: [4.599, 16.51],
  Elnath: [5.438, 28.607],
  Zeta_Tau: [5.627, 21.143],
  Hyadum: [4.328, 15.627],
  Lambda_Tau: [4.011, 12.49],

  Capella: [5.278, 45.998],
  Menkalinan: [5.999, 44.947],
  Maaz: [5.038, 43.823],
  Delta_Aur: [5.992, 54.285],
  Iota_Aur: [4.95, 33.166],

  Altair: [19.846, 8.868],
  Tarazed: [19.771, 10.613],
  Alshain: [19.921, 6.407],
  Zeta_Aql: [19.09, 13.863],
  Lambda_Aql: [19.105, -4.882],

  Acrux: [12.443, -63.099],
  Mimosa: [12.795, -59.689],
  Gamma_Cru: [12.519, -57.113],
  Delta_Cru: [12.353, -58.749],
};

type StarPair = readonly [string, string];

const LINES: Record<string, readonly StarPair[]> = {
  Orion: [
    ['Meissa', 'Betelgeuse'],
    ['Meissa', 'Bellatrix'],
    ['Betelgeuse', 'Mintaka'],
    ['Bellatrix', 'Mintaka'],
    ['Mintaka', 'Alnilam'],
    ['Alnilam', 'Alnitak'],
    ['Alnitak', 'Saiph'],
    ['Alnitak', 'Rigel'],
    ['Saiph', 'Rigel'],
  ],
  Ursa_Major: [
    ['Alkaid', 'Mizar'],
    ['Mizar', 'Alioth'],
    ['Alioth', 'Megrez'],
    ['Megrez', 'Phecda'],
    ['Phecda', 'Merak'],
    ['Merak', 'Dubhe'],
    ['Dubhe', 'Megrez'],
  ],
  Cassiopeia: [
    ['Caph', 'Schedar'],
    ['Schedar', 'Gamma_Cas'],
    ['Gamma_Cas', 'Ruchbah'],
    ['Ruchbah', 'Segin'],
  ],
  Leo: [
    ['Regulus', 'Eta_Leo'],
    ['Eta_Leo', 'Algieba'],
    ['Algieba', 'Chertan'],
    ['Chertan', 'Zosma'],
    ['Zosma', 'Denebola'],
    ['Regulus', 'Chertan'],
  ],
  Scorpius: [
    ['Graffias', 'Dschubba'],
    ['Dschubba', 'Antares'],
    ['Antares', 'Sargas'],
    ['Sargas', 'Shaula'],
    ['Shaula', 'Lesath'],
    ['Sargas', 'Girtab'],
  ],
  Cygnus: [
    ['Deneb', 'Sadr'],
    ['Delta_Cyg', 'Sadr'],
    ['Sadr', 'Gienah_Cyg'],
    ['Sadr', 'Albireo'],
  ],
  Lyra: [
    ['Vega', 'Zeta_Lyr'],
    ['Zeta_Lyr', 'Sheliak'],
    ['Sheliak', 'Sulafat'],
    ['Sulafat', 'Zeta_Lyr'],
  ],
  Gemini: [
    ['Propus', 'Tejat'],
    ['Tejat', 'Mebsuda'],
    ['Mebsuda', 'Castor'],
    ['Mebsuda', 'Wasat'],
    ['Wasat', 'Alhena'],
    ['Castor', 'Pollux'],
    ['Pollux', 'Wasat'],
  ],
  Perseus: [
    ['Gamma_Per', 'Mirfak'],
    ['Mirfak', 'Delta_Per'],
    ['Delta_Per', 'Epsilon_Per'],
    ['Epsilon_Per', 'Algol'],
    ['Algol', 'Delta_Per'],
  ],
  Taurus: [
    ['Lambda_Tau', 'Hyadum'],
    ['Hyadum', 'Aldebaran'],
    ['Aldebaran', 'Elnath'],
    ['Aldebaran', 'Zeta_Tau'],
  ],
  Auriga: [
    ['Iota_Aur', 'Maaz'],
    ['Maaz', 'Capella'],
    ['Capella', 'Menkalinan'],
    ['Menkalinan', 'Delta_Aur'],
    ['Delta_Aur', 'Maaz'],
  ],
  Aquila: [
    ['Zeta_Aql', 'Tarazed'],
    ['Tarazed', 'Altair'],
    ['Altair', 'Alshain'],
    ['Altair', 'Lambda_Aql'],
  ],
  Crux: [
    ['Acrux', 'Gamma_Cru'],
    ['Mimosa', 'Delta_Cru'],
  ],
};

function starToVec3(raHours: number, decDeg: number, radius: number): THREE.Vector3 {
  const ra = raHours * (Math.PI / 12);
  const dec = decDeg * (Math.PI / 180);
  return new THREE.Vector3(
    radius * Math.cos(dec) * Math.cos(ra),
    radius * Math.sin(dec),
    radius * Math.cos(dec) * Math.sin(ra),
  );
}

export default function createConstellations(skyRadius = 1750): THREE.Group {
  const group = new THREE.Group();

  const linePositions: number[] = [];

  for (const pairs of Object.values(LINES)) {
    for (const [a, b] of pairs) {
      const starA = STARS[a];
      const starB = STARS[b];
      if (!starA || !starB) continue;
      const va = starToVec3(starA[0], starA[1], skyRadius);
      const vb = starToVec3(starB[0], starB[1], skyRadius);
      linePositions.push(va.x, va.y, va.z);
      linePositions.push(vb.x, vb.y, vb.z);
    }
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const lineMat = new THREE.LineBasicMaterial({
    color: 0x6688cc,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  group.add(new THREE.LineSegments(lineGeo, lineMat));

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 32;
  spriteCanvas.height = 32;
  const ctx = spriteCanvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get 2D canvas context');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0.0, 'rgba(200,220,255,1.0)');
  g.addColorStop(0.15, 'rgba(180,200,255,0.9)');
  g.addColorStop(0.4, 'rgba(140,170,255,0.4)');
  g.addColorStop(1.0, 'rgba(100,140,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const sprite = new THREE.CanvasTexture(spriteCanvas);

  const starPositions: number[] = [];
  const starSizes: number[] = [];

  for (const [ra, dec] of Object.values(STARS)) {
    const v = starToVec3(ra, dec, skyRadius - 2);
    starPositions.push(v.x, v.y, v.z);
    starSizes.push(3.5 + Math.random() * 2.5);
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeo.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

  const starMat = new THREE.PointsMaterial({
    map: sprite,
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.02,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xaabbff,
  });

  group.add(new THREE.Points(starGeo, starMat));

  return group;
}

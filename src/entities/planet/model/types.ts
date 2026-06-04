export type PlanetType = 'terrestrial' | 'gas_giant' | 'ice_giant';

export interface AtmosphereComponent {
  gas: string;
  percent: number;
}

export interface PlanetAtmosphere {
  composition: readonly AtmosphereComponent[];
  surfacePressureAtm: number;
  hasGreenhouse: boolean;
  notes: string;
}

export interface RingBand {
  start: number;
  end: number;
  color: string;
  opacity: number;
}

export interface RingData {
  innerRadiusScale: number;
  outerRadiusScale: number;
  bands: readonly RingBand[];
}

export type CanvasTextureTechnique =
  | 'cratered'
  | 'banded'
  | 'stormy'
  | 'terrestrial'
  | 'icy'
  | 'ringed'
  | 'desert';

export interface CanvasTexture {
  technique: CanvasTextureTechnique | string;
  palette: readonly string[];
  noiseScale: number;
  craterDensity?: number;
  cloudDensity?: number;
  stormCount?: number;
  bandCount?: number;
}

export interface Moon {
  name: string;
  radiusKm: number;
  distanceKm: number;
  periodDays: number;
  discoveredBy: string;
  discoveredYear: number;
  description: string;
  notes?: string;
}

export interface PlanetMissionSummary {
  name: string;
  agency: string;
  year: number;
  type: string;
  achievement: string;
}

export interface Planet {

  slug: string;
  name: string;
  index: number;
  type: PlanetType | string;
  description: string;

  semiMajorAxisAU: number;
  eccentricity: number;
  inclinationDeg: number;
  periodDays: number;
  orbitalSpeedKmS: number;

  radiusKm: number;
  massKg: number;
  massEarths: number;
  surfaceGravityMs2: number;
  escapeVelocityKmS: number;
  densityGCm3: number;
  obliquityDeg: number;
  rotationPeriodHours: number;
  flatteningFactor: number;

  tempMinC: number;
  tempMaxC: number;
  tempAvgC: number;
  albedo: number;

  atmosphere: PlanetAtmosphere;

  surfaceFeatures: readonly string[];
  facts: readonly string[];
  moons: readonly Moon[];
  totalMoonCount: number;
  missions: readonly PlanetMissionSummary[];

  colorHex: string;
  emissiveHex: string;
  roughness: number;
  metalness: number;
  hasAtmosphereGlow: boolean;
  atmosphereColorHex: string | null;
  atmosphereOpacity: number;
  hasCloudLayer: boolean;
  cloudColorHex: string | null;
  hasRings: boolean;
  ringData: RingData | null;
  visualRadius: number;
  orbitDistance: number;
  canvasTexture: CanvasTexture | null;
}

export type PlanetIndex = number;

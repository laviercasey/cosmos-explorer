import type {
  CanvasTexture,
  Moon,
  Planet,
  PlanetAtmosphere,
  PlanetMissionSummary,
  RingBand,
  RingData,
} from '@entities/planet/model/types';
import type {
  Mission,
  Trajectory,
  TrajectoryPhase,
  TrajectoryWaypoint,
} from '@entities/mission/model/types';

import type * as cosmosv1 from './gen/cosmos/v1/cosmos_pb';


function flattenRingBand(b: cosmosv1.RingBand): RingBand {
  return {
    start: b.start,
    end: b.end,
    color: b.color,
    opacity: b.opacity,
  };
}

function flattenRingData(r: cosmosv1.RingData | undefined): RingData | null {
  if (!r) return null;
  return {
    innerRadiusScale: r.innerRadiusScale,
    outerRadiusScale: r.outerRadiusScale,
    bands: r.bands.map(flattenRingBand),
  };
}

function flattenCanvasTexture(c: cosmosv1.CanvasTexture | undefined): CanvasTexture | null {
  if (!c) return null;
  const out: CanvasTexture = {
    technique: c.technique,
    palette: c.palette,
    noiseScale: c.noiseScale,
  };
  if (c.craterDensity !== undefined && c.craterDensity !== 0) {
    out.craterDensity = c.craterDensity;
  }
  if (c.cloudDensity !== undefined) {
    out.cloudDensity = c.cloudDensity;
  }
  if (c.stormCount !== undefined) {
    out.stormCount = c.stormCount;
  }
  if (c.bandCount !== undefined) {
    out.bandCount = c.bandCount;
  }
  return out;
}

function flattenAtmosphere(a: cosmosv1.Atmosphere | undefined): PlanetAtmosphere {
  if (!a) {
    return {
      composition: [],
      surfacePressureAtm: 0,
      hasGreenhouse: false,
      notes: '',
    };
  }
  return {
    composition: a.composition.map((c) => ({ gas: c.gas, percent: c.percent })),
    surfacePressureAtm: a.surfacePressureAtm,
    hasGreenhouse: a.hasGreenhouse,
    notes: a.notes,
  };
}

function flattenMoon(m: cosmosv1.Moon): Moon {
  return {
    name: m.name,
    radiusKm: m.radiusKm,
    distanceKm: m.distanceKm,
    periodDays: m.periodDays,
    discoveredBy: m.discoveredBy,
    discoveredYear: m.discoveredYear,
    description: m.description,
  };
}

function flattenPlanetMission(m: cosmosv1.PlanetMissionRef): PlanetMissionSummary {
  return {
    name: m.name,
    agency: m.agency,
    year: m.year,
    type: m.type,
    achievement: m.achievement,
  };
}

export function flattenPlanet(p: cosmosv1.Planet): Planet {
  const orbital = p.orbital;
  const physical = p.physical;
  const thermal = p.thermal;
  const visual = p.visual;

  const moons: readonly Moon[] = p.moons.map(flattenMoon);
  const missions: readonly PlanetMissionSummary[] = p.missions.map(flattenPlanetMission);

  return {
    slug: p.slug,
    name: p.name,
    index: p.index,
    type: p.type,
    description: p.description,

    semiMajorAxisAU: orbital?.semiMajorAxisAu ?? 0,
    eccentricity: orbital?.eccentricity ?? 0,
    inclinationDeg: orbital?.inclinationDeg ?? 0,
    periodDays: orbital?.periodDays ?? 0,
    orbitalSpeedKmS: orbital?.orbitalSpeedKmS ?? 0,

    radiusKm: physical?.radiusKm ?? 0,
    massKg: physical?.massKg ?? 0,
    massEarths: physical?.massEarths ?? 0,
    surfaceGravityMs2: physical?.surfaceGravityMS2 ?? 0,
    escapeVelocityKmS: physical?.escapeVelocityKmS ?? 0,
    densityGCm3: physical?.densityGCm3 ?? 0,
    obliquityDeg: physical?.obliquityDeg ?? 0,
    rotationPeriodHours: physical?.rotationPeriodHours ?? 0,
    flatteningFactor: physical?.flatteningFactor ?? 0,

    tempMinC: thermal?.tempMinC ?? 0,
    tempMaxC: thermal?.tempMaxC ?? 0,
    tempAvgC: thermal?.tempAvgC ?? 0,
    albedo: thermal?.albedo ?? 0,

    atmosphere: flattenAtmosphere(p.atmosphere),

    surfaceFeatures: p.surfaceFeatures,
    facts: p.facts,
    moons,
    totalMoonCount: p.totalMoonCount !== 0 ? p.totalMoonCount : moons.length,
    missions,

    colorHex: visual?.colorHex ?? '#888888',
    emissiveHex: visual?.emissiveHex ?? '#000000',
    roughness: visual?.roughness ?? 0.7,
    metalness: visual?.metalness ?? 0,
    hasAtmosphereGlow: Boolean(visual?.hasAtmosphereGlow),
    atmosphereColorHex: visual?.atmosphereColorHex ?? null,
    atmosphereOpacity: visual?.atmosphereOpacity ?? 0,
    hasCloudLayer: Boolean(visual?.hasCloudLayer),
    cloudColorHex: visual?.cloudColorHex ?? null,
    hasRings: Boolean(visual?.hasRings),
    ringData: flattenRingData(visual?.ringData),
    visualRadius: visual?.visualRadius ?? 1,
    orbitDistance: visual?.orbitDistance ?? 20,
    canvasTexture: flattenCanvasTexture(visual?.canvasTexture),
  };
}


export function flattenMission(m: cosmosv1.Mission): Mission {
  return {
    id: m.slug,
    slug: m.slug,
    name: m.name,
    agency: m.agency,
    country: m.country,
    year: m.year,
    endYear: m.endYear ?? null,
    destination: m.destination,
    type: m.type,
    status: m.status,
    description: m.description,
    keyFact: m.keyFact === '' ? null : m.keyFact,
    achievements: m.achievements,
    crew: m.crew.length > 0 ? m.crew : null,
    planetSlugs: m.planetSlugs,
  };
}


function flattenWaypoint(w: cosmosv1.TrajectoryWaypoint): TrajectoryWaypoint {
  return [w.x, w.y, w.z] as const;
}

function flattenPhase(p: cosmosv1.TrajectoryPhase): TrajectoryPhase {
  return {
    id: p.id,
    label: p.label,
    t: [p.tStart, p.tEnd] as const,
    description: p.description,
  };
}

export function flattenTrajectory(t: cosmosv1.Trajectory): Trajectory {
  const moonPos: readonly [number, number, number] = t.moonPos
    ? [t.moonPos.x, t.moonPos.y, t.moonPos.z]
    : [0, 0, 0];

  return {
    missionSlug: t.missionSlug,
    missionName: t.missionName,
    agency: t.agency,
    year: t.year,
    duration: t.duration,
    durationRu: t.durationRu ?? '',
    crew: t.crew,
    moonPos,
    moonOrbitArc: t.moonOrbitArc,
    waypoints: t.waypoints.map(flattenWaypoint),
    simDuration: t.simDurationS,
    phases: t.phases.map(flattenPhase),
  };
}

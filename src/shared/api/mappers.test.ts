import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  AtmosphereSchema,
  CanvasTextureSchema,
  MissionSchema,
  MoonSchema,
  OrbitalParamsSchema,
  PhysicalParamsSchema,
  PlanetMissionRefSchema,
  PlanetSchema,
  RingBandSchema,
  RingDataSchema,
  ThermalParamsSchema,
  TrajectoryPhaseSchema,
  TrajectorySchema,
  TrajectoryWaypointSchema,
  VisualSchema,
} from './gen/cosmos/v1/cosmos_pb';
import { flattenMission, flattenPlanet, flattenTrajectory } from './mappers';


describe('flattenPlanet', () => {
  it('flattens nested orbital/physical/thermal/visual blocks and applies R1 field renames', () => {
    const mercury = create(PlanetSchema, {
      slug: 'mercury',
      name: 'Mercury',
      index: 0,
      type: 'terrestrial',
      description: 'The smallest planet.',
      orbital: create(OrbitalParamsSchema, {
        semiMajorAxisAu: 0.387, 
        eccentricity: 0.2056,
        inclinationDeg: 7.0,
        periodDays: 87.97,
        orbitalSpeedKmS: 47.36,
      }),
      physical: create(PhysicalParamsSchema, {
        radiusKm: 2439.7,
        massKg: 3.301e23,
        massEarths: 0.055,
        surfaceGravityMS2: 3.7, 
        escapeVelocityKmS: 4.25,
        densityGCm3: 5.427,
        obliquityDeg: 0.034,
        rotationPeriodHours: 1407.6,
        flatteningFactor: 0,
      }),
      thermal: create(ThermalParamsSchema, {
        tempMinC: -180,
        tempMaxC: 430,
        tempAvgC: 167,
        albedo: 0.088,
      }),
      atmosphere: create(AtmosphereSchema, {
        surfacePressureAtm: 0,
        hasGreenhouse: false,
        notes: 'Exosphere only.',
        composition: [
          { gas: 'Oxygen', percent: 42.0 },
          { gas: 'Sodium', percent: 29.0 },
        ],
      }),
      visual: create(VisualSchema, {
        colorHex: '#a8a8a8',
        emissiveHex: '#111111',
        roughness: 0.95,
        metalness: 0.1,
        hasAtmosphereGlow: false,
        atmosphereOpacity: 0,
        hasCloudLayer: false,
        hasRings: false,
        visualRadius: 0.38,
        orbitDistance: 9,
        canvasTexture: create(CanvasTextureSchema, {
          technique: 'cratered',
          palette: ['#b0b0b0', '#8a8a8a'],
          noiseScale: 6.0,
          craterDensity: 0.7,
        }),
      }),
      surfaceFeatures: ['Caloris Basin'],
      facts: ['Fact 1'],
      moons: [],
      totalMoonCount: 0,
      missions: [
        create(PlanetMissionRefSchema, {
          slug: 'mariner-10',
          name: 'Mariner 10',
          agency: 'NASA',
          year: 1974,
          type: 'flyby',
          achievement: 'First visit',
        }),
      ],
    });

    const result = flattenPlanet(mercury);

    expect(result.slug).toBe('mercury');
    expect(result.name).toBe('Mercury');
    expect(result.index).toBe(0);
    expect(result.description).toBe('The smallest planet.');

    expect(result.semiMajorAxisAU).toBe(0.387);
    expect(result.surfaceGravityMs2).toBe(3.7);

    expect(result.eccentricity).toBe(0.2056);
    expect(result.orbitalSpeedKmS).toBe(47.36);
    expect(result.radiusKm).toBe(2439.7);
    expect(result.rotationPeriodHours).toBe(1407.6);
    expect(result.escapeVelocityKmS).toBe(4.25);
    expect(result.tempMinC).toBe(-180);
    expect(result.colorHex).toBe('#a8a8a8');

    expect(result.atmosphere.composition).toHaveLength(2);
    expect(result.atmosphere.composition[0]?.gas).toBe('Oxygen');
    expect(result.atmosphere.notes).toBe('Exosphere only.');

    expect(result.canvasTexture?.technique).toBe('cratered');
    expect(result.canvasTexture?.craterDensity).toBe(0.7);
    expect(result.canvasTexture?.noiseScale).toBe(6.0);

    expect(result.missions).toHaveLength(1);
    expect(result.missions[0]?.name).toBe('Mariner 10');
    expect(result.missions[0]?.agency).toBe('NASA');
  });

  it('fills safe defaults when nested submessages are missing (proto3 undefined)', () => {
    const saturn = create(PlanetSchema, {
      slug: 'saturn',
      name: 'Saturn',
      index: 5,
      type: 'gas_giant',
      description: 'Ringed planet.',
      visual: create(VisualSchema, {
        colorHex: '#ddcc88',
        emissiveHex: '#222211',
        roughness: 0.6,
        hasAtmosphereGlow: true,
        atmosphereColorHex: '#eeddaa',
        atmosphereOpacity: 0.4,
        hasRings: true,
        ringData: create(RingDataSchema, {
          innerRadiusScale: 1.2,
          outerRadiusScale: 2.3,
          bands: [
            create(RingBandSchema, { start: 0.0, end: 0.3, color: '#aaa', opacity: 0.4 }),
            create(RingBandSchema, { start: 0.35, end: 0.9, color: '#bbb', opacity: 0.7 }),
          ],
        }),
        visualRadius: 2.5,
        orbitDistance: 70,
      }),
      totalMoonCount: 146,
    });

    const result = flattenPlanet(saturn);

    expect(result.semiMajorAxisAU).toBe(0);
    expect(result.radiusKm).toBe(0);
    expect(result.tempAvgC).toBe(0);

    expect(result.atmosphere.composition).toEqual([]);
    expect(result.atmosphere.notes).toBe('');
    expect(result.atmosphere.hasGreenhouse).toBe(false);
    expect(result.atmosphere.surfacePressureAtm).toBe(0);

    expect(result.moons).toEqual([]);
    expect(result.facts).toEqual([]);
    expect(result.missions).toEqual([]);
    expect(result.surfaceFeatures).toEqual([]);

    expect(result.totalMoonCount).toBe(146);

    expect(result.ringData).not.toBeNull();
    expect(result.ringData?.innerRadiusScale).toBe(1.2);
    expect(result.ringData?.outerRadiusScale).toBe(2.3);
    expect(result.ringData?.bands).toHaveLength(2);
    expect(result.ringData?.bands[0]?.start).toBe(0);
    expect(result.ringData?.bands[1]?.opacity).toBe(0.7);

    expect(result.atmosphereColorHex).toBe('#eeddaa');
    expect(result.cloudColorHex).toBeNull();
    expect(result.canvasTexture).toBeNull();
  });

  it('falls back totalMoonCount to moons.length when proto field is zero', () => {
    const planet = create(PlanetSchema, {
      slug: 'p',
      name: 'P',
      moons: [
        create(MoonSchema, { name: 'M1' }),
        create(MoonSchema, { name: 'M2' }),
      ],
      totalMoonCount: 0,
    });

    expect(flattenPlanet(planet).totalMoonCount).toBe(2);
  });

  it('returns ringData null when visual is undefined entirely', () => {
    const planet = create(PlanetSchema, { slug: 'x', name: 'X' });
    const out = flattenPlanet(planet);
    expect(out.ringData).toBeNull();
    expect(out.canvasTexture).toBeNull();
    expect(out.colorHex).toBe('#888888'); 
    expect(out.visualRadius).toBe(1);
    expect(out.orbitDistance).toBe(20);
  });

  it('flattens moon fields camelCase intact', () => {
    const planet = create(PlanetSchema, {
      slug: 'earth',
      name: 'Earth',
      moons: [
        create(MoonSchema, {
          name: 'Moon',
          radiusKm: 1737,
          distanceKm: 384_400,
          periodDays: 27.32,
          discoveredBy: 'Prehistoric',
          discoveredYear: -3000,
          description: 'Earth natural satellite',
        }),
      ],
    });
    const result = flattenPlanet(planet);
    expect(result.moons[0]).toEqual({
      name: 'Moon',
      radiusKm: 1737,
      distanceKm: 384_400,
      periodDays: 27.32,
      discoveredBy: 'Prehistoric',
      discoveredYear: -3000,
      description: 'Earth natural satellite',
    });
  });
});


describe('flattenMission', () => {
  it('maps all mission fields and fabricates id from slug', () => {
    const sputnik = create(MissionSchema, {
      slug: 'sputnik-1',
      name: 'Sputnik 1',
      agency: 'Soviet',
      country: 'USSR',
      year: 1957,
      endYear: 1958,
      destination: 'Earth Orbit',
      type: 'robotic',
      status: 'completed',
      description: 'First satellite.',
      keyFact: 'Radio beeps heard worldwide.',
      achievements: ['First satellite in orbit'],
      planetSlugs: ['earth'],
    });
    const result = flattenMission(sputnik);

    expect(result.id).toBe('sputnik-1');
    expect(result.slug).toBe('sputnik-1');
    expect(result.name).toBe('Sputnik 1');
    expect(result.endYear).toBe(1958);
    expect(result.keyFact).toBe('Radio beeps heard worldwide.');
    expect(result.achievements).toEqual(['First satellite in orbit']);
    expect(result.planetSlugs).toEqual(['earth']);
  });

  it('preserves crew when present', () => {
    const apollo = create(MissionSchema, {
      slug: 'apollo-11',
      name: 'Apollo 11',
      year: 1969,
      crew: ['Armstrong', 'Aldrin', 'Collins'],
    });
    expect(flattenMission(apollo).crew).toEqual(['Armstrong', 'Aldrin', 'Collins']);
  });

  it('returns crew as null when proto3 array is empty (robotic mission semantics)', () => {
    const robotic = create(MissionSchema, {
      slug: 'voyager-1',
      name: 'Voyager 1',
      year: 1977,
      crew: [],
    });
    expect(flattenMission(robotic).crew).toBeNull();
  });

  it('converts undefined endYear to null', () => {
    const ongoing = create(MissionSchema, {
      slug: 'iss',
      name: 'ISS',
      year: 1998,
    });
    expect(flattenMission(ongoing).endYear).toBeNull();
  });

  it('converts empty keyFact to null (proto3 default)', () => {
    const m = create(MissionSchema, {
      slug: 'm',
      name: 'M',
      year: 2000,
      keyFact: '',
    });
    expect(flattenMission(m).keyFact).toBeNull();
  });
});


describe('flattenTrajectory', () => {
  it('converts phase {tStart, tEnd} to tuple [start, end] and applies sim-duration rename', () => {
    const t = create(TrajectorySchema, {
      missionSlug: 'artemis-2',
      missionName: 'Artemis 2',
      agency: 'NASA',
      year: 2026,
      duration: '9 days 1 hour',
      durationRu: '9 суток 1 час',
      crew: ['Reid Wiseman'],
      moonPos: create(TrajectoryWaypointSchema, { x: 5.5, y: 0, z: 2.0 }),
      moonOrbitArc: 2.08,
      simDurationS: 60,
      waypoints: [
        create(TrajectoryWaypointSchema, { x: 0, y: 0.1, z: 1.1 }),
        create(TrajectoryWaypointSchema, { x: 1.0, y: 0.1, z: 0.5 }),
      ],
      phases: [
        create(TrajectoryPhaseSchema, {
          id: 'leo',
          label: 'Launch & Earth Orbit',
          tStart: 0.0,
          tEnd: 0.26,
          description: 'Launch phase.',
        }),
      ],
    });

    const result = flattenTrajectory(t);

    expect(result.phases).toHaveLength(1);
    expect(result.phases[0]?.t).toEqual([0.0, 0.26]);
    expect(result.phases[0]?.id).toBe('leo');
    expect(result.phases[0]?.label).toBe('Launch & Earth Orbit');
    expect(result.phases[0]?.description).toBe('Launch phase.');

    expect(result.simDuration).toBe(60);

    expect(result.waypoints).toHaveLength(2);
    expect(result.waypoints[0]).toEqual([0, 0.1, 1.1]);
    expect(result.waypoints[1]).toEqual([1.0, 0.1, 0.5]);

    expect(result.moonPos).toEqual([5.5, 0, 2.0]);

    expect(result.durationRu).toBe('9 суток 1 час');
    expect(result.crew).toEqual(['Reid Wiseman']);
  });

  it('defaults moonPos to [0,0,0] when undefined', () => {
    const t = create(TrajectorySchema, {
      missionSlug: 'x',
      missionName: 'X',
      agency: 'NASA',
      year: 2020,
      duration: '1 day',
    });
    const result = flattenTrajectory(t);
    expect(result.moonPos).toEqual([0, 0, 0]);
    expect(result.waypoints).toEqual([]);
    expect(result.phases).toEqual([]);
    expect(result.crew).toEqual([]);
    expect(result.simDuration).toBe(0);
  });

  it('treats missing optional durationRu as empty string', () => {
    const t = create(TrajectorySchema, {
      missionSlug: 'x',
      missionName: 'X',
      agency: 'NASA',
      year: 2020,
      duration: '1 day',
    });
    expect(flattenTrajectory(t).durationRu).toBe('');
  });
});

import { render, renderHook, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';

import type { Mission, Trajectory } from '@entities/mission/model/types';
import type { Planet } from '@entities/planet/model/types';

import DataCacheClient, { useData } from './DataCacheClient';

const basePlanet: Planet = {
  name: 'Mercury',
  slug: 'mercury',
  index: 0,
  type: 'terrestrial',
  description: '',
  semiMajorAxisAU: 0.387,
  eccentricity: 0.2,
  inclinationDeg: 7,
  periodDays: 88,
  orbitalSpeedKmS: 47,
  radiusKm: 2439,
  massKg: 3e23,
  massEarths: 0.055,
  surfaceGravityMs2: 3.7,
  escapeVelocityKmS: 4.25,
  densityGCm3: 5.4,
  obliquityDeg: 0,
  rotationPeriodHours: 1407,
  flatteningFactor: 0,
  tempMinC: -180,
  tempMaxC: 430,
  tempAvgC: 167,
  albedo: 0.088,
  atmosphere: { composition: [], surfacePressureAtm: 0, hasGreenhouse: false, notes: '' },
  surfaceFeatures: [],
  facts: [],
  moons: [],
  totalMoonCount: 0,
  missions: [],
  colorHex: '#aaa',
  emissiveHex: '#000',
  roughness: 1,
  metalness: 0,
  hasAtmosphereGlow: false,
  atmosphereColorHex: null,
  atmosphereOpacity: 0,
  hasCloudLayer: false,
  cloudColorHex: null,
  hasRings: false,
  ringData: null,
  visualRadius: 0.38,
  orbitDistance: 9,
  canvasTexture: null,
};

const baseMission: Mission = {
  id: 'sputnik-1',
  slug: 'sputnik-1',
  name: 'Sputnik 1',
  agency: 'Soviet',
  country: 'USSR',
  year: 1957,
  endYear: 1958,
  destination: 'Earth Orbit',
  type: 'robotic',
  status: 'completed',
  description: '',
  keyFact: null,
  achievements: [],
  crew: null,
  planetSlugs: [],
};

function makeInitial(overrides: {
  planets?: readonly Planet[];
  missions?: readonly Mission[];
  trajectories?: Readonly<Record<string, Trajectory>>;
}) {
  return {
    planets: overrides.planets ?? [],
    missions: overrides.missions ?? [],
    trajectories: overrides.trajectories ?? {},
  };
}

function Consumer(): JSX.Element {
  const { loading, error, planets, missions, agencies, destinations, types, decades } = useData();
  return (
    <div>
      <div>loading: {String(loading)}</div>
      <div>error: {String(error)}</div>
      <div>planets: {planets.length}</div>
      <div>missions: {missions.length}</div>
      <div>agencies: {agencies.join(',')}</div>
      <div>destinations: {destinations.join(',')}</div>
      <div>types: {types.join(',')}</div>
      <div>decades: {decades.join(',')}</div>
    </div>
  );
}

describe('DataCacheClient', () => {
  it('exposes pre-fetched data with loading=false / error=null', () => {
    render(
      <DataCacheClient
        initial={makeInitial({ planets: [basePlanet], missions: [baseMission] })}
      >
        <Consumer />
      </DataCacheClient>,
    );

    expect(screen.getByText('loading: false')).toBeInTheDocument();
    expect(screen.getByText('error: null')).toBeInTheDocument();
    expect(screen.getByText('planets: 1')).toBeInTheDocument();
    expect(screen.getByText('missions: 1')).toBeInTheDocument();
  });

  it('derives agencies/destinations/types/decades facets from missions', () => {
    const missions: readonly Mission[] = [
      baseMission,
      {
        ...baseMission,
        id: '2',
        slug: '2',
        name: 'Apollo 11',
        agency: 'NASA',
        destination: 'Moon',
        type: 'crewed',
        year: 1969,
      },
    ];
    render(
      <DataCacheClient initial={makeInitial({ missions })}>
        <Consumer />
      </DataCacheClient>,
    );

    expect(screen.getByText(/agencies: NASA,Soviet/)).toBeInTheDocument();
    expect(screen.getByText(/destinations: Earth Orbit,Moon/)).toBeInTheDocument();
    expect(screen.getByText(/types: crewed,robotic/)).toBeInTheDocument();
    expect(screen.getByText(/decades: 1950s,1960s/)).toBeInTheDocument();
  });

  it('handles empty initial data without errors', () => {
    render(
      <DataCacheClient initial={makeInitial({})}>
        <Consumer />
      </DataCacheClient>,
    );
    expect(screen.getByText('planets: 0')).toBeInTheDocument();
    expect(screen.getByText('missions: 0')).toBeInTheDocument();
  });

  it('throws in useData() when called outside provider', () => {
    expect(() => {
      renderHook(() => useData());
    }).toThrow(/useData/);
  });
});

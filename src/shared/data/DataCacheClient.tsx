'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { Mission, Trajectory } from '@entities/mission/model/types';
import type { Planet } from '@entities/planet/model/types';

import type { DataContextValue, Facets } from './types';

const DataContext = createContext<DataContextValue | null>(null);

export interface InitialData {
  readonly planets: readonly Planet[];
  readonly missions: readonly Mission[];
  readonly trajectories: Readonly<Record<string, Trajectory>>;
}

export interface DataCacheClientProps {
  initial: InitialData;
  children: ReactNode;
}

function deriveFacets(missions: readonly Mission[]): Facets {
  const agencies = [...new Set(missions.map((m) => m.agency).filter(Boolean))].sort();
  const destinations = [...new Set(missions.map((m) => m.destination).filter(Boolean))].sort();
  const types = [...new Set(missions.map((m) => m.type).filter(Boolean))].sort();
  const decades = [
    ...new Set(
      missions
        .map((m) =>
          typeof m.year === 'number' ? `${String(Math.floor(m.year / 10) * 10)}s` : null,
        )
        .filter((d): d is string => d !== null),
    ),
  ].sort();
  return { agencies, destinations, types, decades };
}

export default function DataCacheClient({ initial, children }: DataCacheClientProps) {
  const { planets, missions, trajectories } = initial;
  const facets = useMemo(() => deriveFacets(missions), [missions]);

  const value = useMemo<DataContextValue>(
    () => ({
      planets,
      missions,
      trajectories,
      agencies: facets.agencies,
      destinations: facets.destinations,
      types: facets.types,
      decades: facets.decades,
      loading: false,
      error: null,
      reload: () => {
      },
    }),
    [planets, missions, trajectories, facets],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData() must be used inside <DataCacheClient>');
  }
  return ctx;
}

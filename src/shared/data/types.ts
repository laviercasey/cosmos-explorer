import type { ReactNode } from 'react';

import type { Mission, Trajectory } from '@entities/mission/model/types';
import type { Planet } from '@entities/planet/model/types';

export interface Facets {
  agencies: readonly string[];
  destinations: readonly string[];
  types: readonly string[];
  decades: readonly string[];
}

export interface DataContextValue extends Facets {
  planets: readonly Planet[];
  missions: readonly Mission[];
  trajectories: Readonly<Record<string, Trajectory>>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export interface DataProviderProps {
  children: ReactNode;
}

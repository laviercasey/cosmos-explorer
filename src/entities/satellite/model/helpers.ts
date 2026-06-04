import type { Satellite } from './types';

const STATION_NORAD_IDS: readonly number[] = [
  25544, 
  48274, 
];

export function formatNoradId(id: number): string {
  if (!Number.isFinite(id) || id < 0) return String(id);
  return Math.floor(id).toString(10).padStart(5, '0');
}

export function isStation(id: number): boolean {
  return STATION_NORAD_IDS.includes(id);
}

export function byBrightness(a: Satellite, b: Satellite): number {
  if (a.highlight !== b.highlight) return a.highlight ? -1 : 1;
  const aStation = isStation(a.id);
  const bStation = isStation(b.id);
  if (aStation !== bStation) return aStation ? -1 : 1;
  return a.name.localeCompare(b.name);
}

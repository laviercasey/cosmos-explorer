import { describe, expect, it } from 'vitest';

import { byBrightness, formatNoradId, isStation } from '../model/helpers';
import type { Satellite } from '../model/types';

function makeSat(over: Partial<Satellite> = {}): Satellite {
  return {
    id: 1,
    name: 'TestSat',
    colorHint: '#fff',
    highlight: false,
    ecefKm: null,
    altKm: null,
    velKms: null,
    lastUpdateMs: null,
    ...over,
  };
}

describe('formatNoradId', () => {
  it('pads to 5 digits', () => {
    expect(formatNoradId(7)).toBe('00007');
    expect(formatNoradId(1234)).toBe('01234');
    expect(formatNoradId(25544)).toBe('25544');
  });

  it('handles large IDs (>5 digits) unchanged in width', () => {
    expect(formatNoradId(123456)).toBe('123456');
  });

  it('returns String() for non-finite', () => {
    expect(formatNoradId(NaN)).toBe('NaN');
    expect(formatNoradId(-1)).toBe('-1');
  });
});

describe('isStation', () => {
  it('recognizes ISS and Tiangong', () => {
    expect(isStation(25544)).toBe(true);
    expect(isStation(48274)).toBe(true);
  });

  it('rejects Hubble and unknowns', () => {
    expect(isStation(20580)).toBe(false);
    expect(isStation(0)).toBe(false);
    expect(isStation(99999)).toBe(false);
  });
});

describe('byBrightness', () => {
  it('puts highlight: true ahead of highlight: false', () => {
    const a = makeSat({ id: 1, name: 'A', highlight: false });
    const b = makeSat({ id: 2, name: 'B', highlight: true });
    const sorted = [a, b].sort(byBrightness);
    expect(sorted[0]!.id).toBe(2);
  });

  it('puts stations ahead of non-stations when highlight matches', () => {
    const station = makeSat({ id: 25544, name: 'ISS' });
    const other = makeSat({ id: 20580, name: 'Hubble' });
    const sorted = [other, station].sort(byBrightness);
    expect(sorted[0]!.id).toBe(25544);
  });

  it('falls through to alphabetical when all flags match', () => {
    const a = makeSat({ id: 1, name: 'Alpha' });
    const b = makeSat({ id: 2, name: 'Bravo' });
    const sorted = [b, a].sort(byBrightness);
    expect(sorted[0]!.name).toBe('Alpha');
  });
});

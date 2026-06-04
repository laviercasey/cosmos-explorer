import { describe, expect, it } from 'vitest';

import { getTypeBadge } from './planetHelpers';

const tFake = (key: string): string => {
  const dict: Record<string, string> = {
    typeTerrestrial: 'Terrestrial',
    typeGasGiant: 'Gas Giant',
    typeIceGiant: 'Ice Giant',
  };
  return dict[key] ?? key;
};

describe('getTypeBadge', () => {
  it('returns terrestrial label/color', () => {
    expect(getTypeBadge('terrestrial', tFake)).toEqual({
      label: 'Terrestrial',
      color: '#88ccff',
    });
  });

  it('returns gas_giant label/color', () => {
    expect(getTypeBadge('gas_giant', tFake)).toEqual({
      label: 'Gas Giant',
      color: '#ffaa44',
    });
  });

  it('returns ice_giant label/color', () => {
    expect(getTypeBadge('ice_giant', tFake)).toEqual({
      label: 'Ice Giant',
      color: '#44ddcc',
    });
  });

  it('falls back to uppercase string + muted color for unknown types', () => {
    const badge = getTypeBadge('dwarf_planet', tFake);
    expect(badge.label).toBe('DWARF_PLANET');
    expect(typeof badge.color).toBe('string');
  });

  it('handles null input', () => {
    const badge = getTypeBadge(null, tFake);
    expect(badge.label).toBe('UNKNOWN');
  });

  it('handles undefined input', () => {
    const badge = getTypeBadge(undefined, tFake);
    expect(badge.label).toBe('UNKNOWN');
  });
});

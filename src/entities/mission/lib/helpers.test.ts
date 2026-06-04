import { describe, expect, it } from 'vitest';

import {
  getAgencyColor,
  getAgencyStyle,
  getDestinationColor,
  getMissionIcon,
  statusColor,
} from './helpers';

describe('getAgencyColor', () => {
  it('returns known agency colors', () => {
    expect(getAgencyColor('NASA')).toBe('#44aaff');
    expect(getAgencyColor('ESA')).toBe('#44ffaa');
    expect(getAgencyColor('Soviet')).toBe('#ff4444');
  });

  it('returns default for unknown', () => {
    expect(getAgencyColor('Acme Aerospace')).toBe('#556677');
  });

  it('handles null/undefined', () => {
    expect(getAgencyColor(null)).toBe('#556677');
    expect(getAgencyColor(undefined)).toBe('#556677');
  });
});

describe('getDestinationColor', () => {
  it('returns direct match for known destination', () => {
    expect(getDestinationColor('Mars')).toBe('#ff7744');
    expect(getDestinationColor('Moon')).toBe('#ccccaa');
  });

  it('finds partial key match', () => {
    const result = getDestinationColor('Low Mars Orbit');
    expect(result).toBe('#ff7744');
  });

  it('returns textMuted for null', () => {
    const result = getDestinationColor(null);
    expect(result).toBe('#334466');
  });

  it('returns fallback for unknown string', () => {
    expect(getDestinationColor('Xenon Rings')).toBe('#667788');
  });
});

describe('statusColor', () => {
  it.each([
    ['active', '#44ff88'],
    ['ongoing', '#44ff88'],
    ['failed', '#ff4444'],
    ['completed', '#778899'],
  ])('%s → %s', (status, expected) => {
    expect(statusColor(status)).toBe(expected);
  });

  it('case-insensitive handling', () => {
    expect(statusColor('ACTIVE')).toBe('#44ff88');
    expect(statusColor('Failed')).toBe('#ff4444');
  });

  it('returns default for null/undefined', () => {
    expect(statusColor(null)).toBe('#556677');
    expect(statusColor(undefined)).toBe('#556677');
  });
});

describe('getAgencyStyle', () => {
  it('returns dedicated style for known agency', () => {
    const nasa = getAgencyStyle('NASA');
    expect(nasa.color).toBe('#88bbff');
    expect(nasa.bg).toContain('rgba');
  });

  it('returns fallback style for unknown', () => {
    const unknown = getAgencyStyle('Unknown Agency');
    expect(unknown.bg).toBe('rgba(40,60,80,0.4)');
  });
});

describe('getMissionIcon', () => {
  it('prefixes with emoji + label for known types', () => {
    expect(getMissionIcon('flyby')).toContain('FLYBY');
    expect(getMissionIcon('orbiter')).toContain('ORBITER');
    expect(getMissionIcon('lander')).toContain('LANDER');
    expect(getMissionIcon('rover')).toContain('LANDER');
    expect(getMissionIcon('impactor')).toContain('IMPACTOR');
  });

  it('uppercases unknown type', () => {
    expect(getMissionIcon('crewed')).toBe('CREWED');
  });

  it('returns empty string for null', () => {
    expect(getMissionIcon(null)).toBe('');
    expect(getMissionIcon(undefined)).toBe('');
  });
});

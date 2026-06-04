import { describe, expect, it } from 'vitest';

import ecefKmToSceneVec3, { ECEF_EARTH_RADIUS_KM } from '../lib/ecefToScene';

describe('ecefKmToSceneVec3', () => {
  it('places an Earth-surface ECEF point at exactly earthRadiusUnits from origin', () => {
    const surface: readonly [number, number, number] = [ECEF_EARTH_RADIUS_KM, 0, 0];
    const v = ecefKmToSceneVec3(surface, 1, 1);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    expect(mag).toBeCloseTo(1, 6);
  });

  it('returns origin for zero ECEF', () => {
    const v = ecefKmToSceneVec3([0, 0, 0], 1);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it('boosts altitude — ISS at 416 km sits ~6x farther above surface', () => {
    const r = ECEF_EARTH_RADIUS_KM + 416;
    const v = ecefKmToSceneVec3([r, 0, 0], 1, 6);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const expected = 1 + (416 / ECEF_EARTH_RADIUS_KM) * 6;
    expect(mag).toBeCloseTo(expected, 4);
  });

  it('swaps WGS-84 Z-up to THREE Y-up', () => {
    const v = ecefKmToSceneVec3([0, 0, ECEF_EARTH_RADIUS_KM], 1, 1);
    expect(v.y).toBeCloseTo(1, 6);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(0, 6);
  });

  it('handles ECEF +Y (90°E meridian on equator) → THREE -Z', () => {
    const v = ecefKmToSceneVec3([0, ECEF_EARTH_RADIUS_KM, 0], 1, 1);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(0, 6);
    expect(v.z).toBeCloseTo(-1, 6);
  });

  it('returns origin for invalid earthRadiusUnits', () => {
    const v = ecefKmToSceneVec3([1000, 0, 0], 0);
    expect(v.x).toBe(0);
    const v2 = ecefKmToSceneVec3([1000, 0, 0], -1);
    expect(v2.x).toBe(0);
  });

  it('uses altBoost=6 by default', () => {
    const r = ECEF_EARTH_RADIUS_KM + 416;
    const defaultBoost = ecefKmToSceneVec3([r, 0, 0], 1);
    const explicitBoost = ecefKmToSceneVec3([r, 0, 0], 1, 6);
    expect(defaultBoost.x).toBeCloseTo(explicitBoost.x, 6);
  });

  it('matches the live ISS sample from the backend smoke-test', () => {
    const v = ecefKmToSceneVec3([4803.05, 3117.31, 3645.52], 1, 6);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    expect(mag).toBeGreaterThan(1);
    expect(mag).toBeLessThan(1.5);
  });
});

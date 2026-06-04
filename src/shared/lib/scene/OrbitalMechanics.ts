import * as THREE from 'three';

import type { Planet } from '@entities/planet/model/types';

const TWO_PI = Math.PI * 2;
const EARTH_PERIOD_DAYS = 365.25;
const REAL_SECONDS_PER_EARTH_ORBIT = 60.0;

export interface OrbitalConfig {
  periodDays: number;
  eccentricity: number;
  semiMajorAxisAU: number;
  orbitDistance: number;
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
  }
  return E;
}

function eccentricToTrue(E: number, e: number): number {
  return (
    2.0 *
    Math.atan2(Math.sqrt(1.0 + e) * Math.sin(E / 2.0), Math.sqrt(1.0 - e) * Math.cos(E / 2.0))
  );
}

function computeOrbitalAngle(
  config: OrbitalConfig | Planet,
  elapsedSeconds: number,
  timeScale: number,
): number {
  const { periodDays, eccentricity } = config;
  const e = eccentricity || 0;

  const periodRatio = periodDays / EARTH_PERIOD_DAYS;
  const realSecondsPerOrbit = REAL_SECONDS_PER_EARTH_ORBIT * periodRatio;
  const n = TWO_PI / realSecondsPerOrbit;

  const M = (((n * elapsedSeconds * timeScale) % TWO_PI) + TWO_PI) % TWO_PI;

  if (e < 1e-6) {
    return M;
  }
  const E = solveKepler(M, e);
  return eccentricToTrue(E, e);
}

export interface OrbitalPosition {
  x: number;
  y: number;
  z: number;
}

function computeOrbitalPosition(
  config: OrbitalConfig | Planet,
  trueAnomaly: number,
): OrbitalPosition {
  const { orbitDistance, semiMajorAxisAU, eccentricity } = config;
  const e = eccentricity || 0;
  const a = semiMajorAxisAU || 1;

  const rAU = (a * (1.0 - e * e)) / (1.0 + e * Math.cos(trueAnomaly));
  const sceneR = rAU * (orbitDistance / a);

  return {
    x: sceneR * Math.cos(trueAnomaly),
    y: 0,
    z: sceneR * Math.sin(trueAnomaly),
  };
}

function generateOrbitPath(config: OrbitalConfig | Planet, segments = 256): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const trueAnomaly = (i / segments) * TWO_PI;
    const pos = computeOrbitalPosition(config, trueAnomaly);
    points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
  }
  return points;
}

export default { computeOrbitalAngle, computeOrbitalPosition, generateOrbitPath };
export { computeOrbitalAngle, computeOrbitalPosition, generateOrbitPath };
